import { ParamsError, SendCommandError } from '../errors';
import { CommandConfirmation } from '../handles/messages/handleCommandConfirmation';
import { logger } from '../logger/index';
import { LightMode } from '../protocols/LightingSettingsBuilder';
import type { Profile } from '../types';
import { delay } from '../utils/delay';
import type { StageIndex } from '../protocols/DpiBuilder';
import type { AttackSharkX11, ProfileState } from './AttackSharkX11';

/**
 * Options for {@link AttackSharkX11.startHoldSwitch}.
 *
 * It needs a button set to FirmwareAction.REPORT_BUTTON (`holdButton` in setupProfiles), because that's the only
 * way the mouse tells the PC about a button press and a release. That button has no action of its own any more:
 * a short press cycles the DPI from the driver (`onShortPress`), a hold switches profile. All of this stops when
 * your program does, and the DPI button is dead until it runs again or you set the button back with
 * setupProfiles (without `holdButton`).
 *
 * The mouse takes a moment to answer every read (the driver waits 250 ms for it), so a DPI cycle lands about half
 * a second after the press, and the light flash starts a quarter of a second after the profile switch. The
 * current profile is read while you're still holding the button, so the switch itself is not delayed.
 *
 * The light flash and the DPI cycle are written to the mouse's own memory like any other setting (about 8 writes
 * for a switch with 3 flashes), so don't expect to do this tens of thousands of times.
 */
export interface HoldSwitchOptions {
	/** How long the button has to be held, 500 ms by default. The switch happens when the time is up, no need to let go. */
	holdMs?: number;
	/** How many times the light flashes after a switch, 3 by default, 0 for none. */
	flashes?: number;
	/** How long each on and each off of the flash lasts, 150 ms by default. */
	flashMs?: number;
	/**
	 * Only react to this button, by the number the firmware gives it (see docs/messages/button-event.md). By default
	 * every button set to REPORT_BUTTON counts, which is fine when it's just the one.
	 */
	buttonId?: number;
	/** What a short press does: cycle the DPI stages ('cycle-dpi', the default), nothing, or your own function. */
	onShortPress?: 'cycle-dpi' | 'none' | (() => void | Promise<void>);
	/** Called after the switch, with the profile that's active now. */
	onSwitch?: (profile: Profile) => void;
	/** Called when something fails (a rejected write, a timeout...). It keeps running afterwards. */
	onError?: (error: Error) => void;
}

const DEFAULT_HOLD_MS = 500;
const DEFAULT_FLASHES = 3;
const DEFAULT_FLASH_MS = 150;
/** Short presses waiting behind the one that's running, more than this are dropped so mashing can't build up a queue. */
const MAX_WAITING_PRESSES = 3;
/** The profile read from the start of a press is good for the hold time plus this. */
const PREFETCH_EXTRA_MS = 1000;

export class HoldSwitch {
	private readonly holdMs: number;
	private readonly flashes: number;
	private readonly flashMs: number;
	private readonly options: HoldSwitchOptions;

	private pressed = false;
	private held = false;
	private ignoreUntilRelease = false;
	private stopped = false;
	private timer: ReturnType<typeof setTimeout> | undefined;

	/** Tasks running or waiting, they run one after the other. */
	private working = 0;
	private tail: Promise<void> = Promise.resolve();
	/** True while a profile switch and its flash are running. */
	private switching = false;
	private prefetched: { state: Promise<ProfileState>; at: number } | undefined;

	constructor(
		private readonly driver: AttackSharkX11,
		options: HoldSwitchOptions = {},
	) {
		this.options = options;
		this.holdMs = options.holdMs ?? DEFAULT_HOLD_MS;
		this.flashes = options.flashes ?? DEFAULT_FLASHES;
		this.flashMs = options.flashMs ?? DEFAULT_FLASH_MS;

		if (!Number.isFinite(this.holdMs) || this.holdMs < 50)
			throw new ParamsError('holdMs', `holdMs has to be at least 50, got ${this.holdMs}`);
		if (!Number.isInteger(this.flashes) || this.flashes < 0 || this.flashes > 10)
			throw new ParamsError('flashes', `flashes has to be a whole number from 0 to 10, got ${this.flashes}`);
		if (!Number.isFinite(this.flashMs) || this.flashMs < 20)
			throw new ParamsError('flashMs', `flashMs has to be at least 20, got ${this.flashMs}`);
	}

	/** Starts listening to the button. Returns the function that stops it. */
	start(): () => void {
		this.driver.on('buttonEvent', this.handleButton);

		return () => this.stop();
	}

	stop(): void {
		this.stopped = true;
		this.driver.off('buttonEvent', this.handleButton);
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;
		this.prefetched = undefined;
	}

	private handleButton = (id: number, isPressed: boolean): void => {
		if (this.stopped) return;
		if (this.options.buttonId !== undefined && id !== this.options.buttonId) return;

		if (isPressed) {
			if (this.pressed) return; // the same press reported twice

			this.pressed = true;
			this.held = false;
			// pressed while a switch or a flash is still going: leave this press alone, all of it
			this.ignoreUntilRelease = this.switching;
			if (this.ignoreUntilRelease) return;

			// Read the profile while the button is down, so a hold can switch the moment the time is up. Only when
			// nothing else is talking to the mouse, the reads can't overlap.
			if (this.working === 0) this.prefetch();

			this.timer = setTimeout(() => {
				this.timer = undefined;
				this.held = true;
				this.enqueue(() => this.switchAndFlash(), true);
			}, this.holdMs);
			return;
		}

		if (!this.pressed) return;
		this.pressed = false;
		if (this.timer !== undefined) clearTimeout(this.timer);
		this.timer = undefined;

		const wasLongOrIgnored = this.held || this.ignoreUntilRelease;
		this.held = false;
		this.ignoreUntilRelease = false;
		if (wasLongOrIgnored) return;

		if (this.working > MAX_WAITING_PRESSES) {
			this.prefetched = undefined;
			return;
		}
		this.enqueue(() => this.shortPress(), false);
	};

	/** How long a read from the start of a press stays good: the hold time and a second on top. */
	private get prefetchMaxAgeMs(): number {
		return this.holdMs + PREFETCH_EXTRA_MS;
	}

	private prefetch(): void {
		// a recent read that nothing used yet (the last press only ran your own function): use that one, so two
		// reads of the mouse never overlap
		if (this.prefetched && Date.now() - this.prefetched.at < this.prefetchMaxAgeMs) return;

		const state = this.driver.getProfileState();
		state.catch(() => undefined); // if nothing ends up using it, the failure isn't an unhandled rejection
		this.prefetched = { state, at: Date.now() };
	}

	/** The profile read at the start of the press if there is a fresh one, otherwise a read now. */
	private takeProfileState(): Promise<ProfileState> {
		const pending = this.prefetched;
		this.prefetched = undefined;

		return pending && Date.now() - pending.at < this.prefetchMaxAgeMs
			? pending.state
			: this.driver.getProfileState();
	}

	/** Runs tasks one at a time, and never lets an error escape as an unhandled rejection. */
	private enqueue(task: () => Promise<void>, isSwitch: boolean): void {
		if (this.stopped) return;

		this.working++;
		this.tail = this.tail
			.then(async () => {
				if (this.stopped) return;

				// the read from the start of the press may still be running, and two reads of the mouse can't overlap
				await this.prefetched?.state.catch(() => undefined);

				this.switching = isSwitch;
				try {
					await task();
				} catch (error) {
					this.report(error instanceof Error ? error : new Error(String(error)));
				} finally {
					this.switching = false;
				}
			})
			.finally(() => {
				this.working--;
			});
	}

	private report(error: Error): void {
		try {
			if (this.options.onError) this.options.onError(error);
			else if (this.driver.listenerCount('error') > 0) this.driver.emit('error', error);
			else logger.error(`hold switch: ${error.message}`, 'HoldSwitch');
		} catch (callbackError) {
			logger.error(`hold switch: the error handler threw: ${callbackError}`, 'HoldSwitch');
		}
	}

	private async switchAndFlash(): Promise<void> {
		const { current, count } = await this.takeProfileState();
		if (count < 2) throw new SendCommandError('only one profile is enabled, there is nothing to switch to');

		const target = ((current % count) + 1) as Profile; // the next one, from the last back to profile 1
		const confirmation = await this.driver.setProfileSettings({
			currentProfileId: target,
			maxProfileCount: count,
		});
		if (confirmation !== CommandConfirmation.Success)
			throw new SendCommandError(`the mouse rejected the switch to profile ${target}`);
		this.options.onSwitch?.(target);

		if (this.flashes > 0) await this.flash(target);
	}

	/**
	 * Flashes the light of the profile that's active now, by switching its light mode off and back (or, if the light
	 * is off in that profile, on and back off). It always ends on the profile's own light mode.
	 *
	 * The lighting is read after the switch on purpose: then it's the active profile's own, whatever the mouse does
	 * with the profile in a read request.
	 */
	private async flash(profile: Profile): Promise<void> {
		const lighting = await this.driver.getLightingSettings(profile);
		lighting.setProfileId(profile); // write it back to the profile that's active now

		const original = lighting.getLightMode();
		const flashMode = original === LightMode.Off ? LightMode.Static : LightMode.Off;
		const write = async (mode: LightMode): Promise<void> => {
			const confirmation = await this.driver.setLightingSettings(lighting.setLightMode(mode));
			if (confirmation !== CommandConfirmation.Success)
				throw new SendCommandError('the mouse rejected a light change while flashing');
		};

		let restored = true;
		try {
			for (let i = 0; i < this.flashes; i++) {
				restored = false;
				await write(flashMode);
				await delay(this.flashMs);

				await write(original);
				restored = true;
				await delay(this.flashMs);
			}
		} finally {
			if (!restored) await write(original).catch(() => undefined);
		}
	}

	private async shortPress(): Promise<void> {
		const { onShortPress = 'cycle-dpi' } = this.options;

		if (onShortPress === 'none') return;
		if (typeof onShortPress === 'function') return void (await onShortPress());

		await this.cycleDpiStage();
	}

	/** Moves the active profile to its next enabled DPI stage, from the last one back to the first. */
	private async cycleDpiStage(): Promise<void> {
		const { current } = await this.takeProfileState();
		const dpi = await this.driver.getDpi(current);

		const active = dpi.getActiveStages();
		const stage = dpi.getCurrentStage();
		let next: number = stage;
		for (let step = 1; step <= 8; step++) {
			const candidate = ((stage - 1 + step) % 8) + 1;
			if (active & (1 << (candidate - 1))) {
				next = candidate;
				break;
			}
		}
		if (next === stage) return; // a single stage, nothing to cycle to

		dpi.setProfileId(current); // write it back to the profile that's active now
		dpi.setCurrentStage(next as StageIndex);
		const confirmation = await this.driver.setDpi(dpi);
		if (confirmation !== CommandConfirmation.Success)
			throw new SendCommandError('the mouse rejected the DPI stage change');
	}
}

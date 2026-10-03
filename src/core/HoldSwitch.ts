import { DriverError, ParamsError, SendCommandError } from '../errors';
import { CommandConfirmation } from '../handles/messages/handleCommandConfirmation';
import { logger } from '../logger/index';
import { LightMode } from '../protocols/LightingSettingsBuilder';
import { type Profile, ReportId, ReportReadLength } from '../types';
import { delay } from '../utils/delay';
import type { AttackSharkX11, ProfileState } from './AttackSharkX11';

/**
 * Options for {@link AttackSharkX11.startHoldSwitch}.
 *
 * How it works: the button is set to FirmwareAction.REPORT_BUTTON (`holdButton` in setupProfiles), so instead of
 * doing something itself it tells the PC when it goes down and when it comes back up. The driver times that: hold
 * it and you go to the next profile, tap it and the DPI stage changes.
 *
 * Good to know:
 * - It only works while your program runs. Without it the button does nothing, and setupProfiles without
 *   `holdButton` gives the button its normal job back.
 * - Every read from the mouse takes about 250 ms, so a tap changes the DPI about half a second later. The profile is
 *   read while you're still holding, so the switch itself isn't late.
 * - Every change is saved in the mouse's memory. A switch with 3 flashes is 7 writes.
 */
export interface HoldSwitchOptions {
	/** How long to hold the button, 500 ms by default. It switches as soon as the time is up, you don't have to let go. */
	holdMs?: number;
	/** How many times the light flashes after a switch, 3 by default, 0 for none. */
	flashes?: number;
	/** How long each on and each off of the flash lasts, 150 ms by default. */
	flashMs?: number;
	/**
	 * Only listen to this button (the number the firmware gives it, see docs/messages/button-event.md). By default
	 * any button set to REPORT_BUTTON counts, which is fine when there's only one.
	 */
	buttonId?: number;
	/** What a tap does: next DPI stage ('cycle-dpi', the default), nothing ('none'), or your own function. */
	onShortPress?: 'cycle-dpi' | 'none' | (() => void | Promise<void>);
	/** Called after each switch, with the new profile. */
	onSwitch?: (profile: Profile) => void;
	/** Called when something goes wrong (a rejected write, a timeout...). It keeps going afterwards. */
	onError?: (error: Error) => void;
}

const DEFAULT_HOLD_MS = 500;
const DEFAULT_FLASHES = 3;
const DEFAULT_FLASH_MS = 150;
/** At most this many taps wait in line. Mashing the button drops the rest instead of building up a backlog. */
const MAX_WAITING_PRESSES = 3;
/** A profile read at the start of a press is used for up to the hold time plus this. */
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

	/** How many tasks are running or waiting. They run one after another, chained on `queue`. */
	private working = 0;
	private queue: Promise<void> = Promise.resolve();
	/** True while a switch and its flash are running. */
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

	/** Resolves when nothing is running or waiting. Never rejects. */
	idle(): Promise<void> {
		return this.queue;
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
			// pressed during a switch or a flash: ignore this whole press, down and up
			this.ignoreUntilRelease = this.switching;
			if (this.ignoreUntilRelease) return;

			// read the profile now, while the button is down, so a hold can switch the moment the time is up
			// (only when nothing else is running, so two reads never overlap)
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

	/** How long a read from the start of a press stays usable. */
	private get prefetchMaxAgeMs(): number {
		return this.holdMs + PREFETCH_EXTRA_MS;
	}

	private prefetch(): void {
		// a recent read nobody used yet is still fine, and starting another one could overlap with it
		if (this.prefetched && Date.now() - this.prefetched.at < this.prefetchMaxAgeMs) return;

		const state = this.driver.getProfileState();
		state.catch(() => undefined); // if nobody uses it, a failed read shouldn't crash anything
		this.prefetched = { state, at: Date.now() };
	}

	/** The profile read at the start of the press if it's recent enough, otherwise a new read. */
	private takeProfileState(): Promise<ProfileState> {
		const pending = this.prefetched;
		this.prefetched = undefined;

		return pending && Date.now() - pending.at < this.prefetchMaxAgeMs
			? pending.state
			: this.driver.getProfileState();
	}

	/** Runs tasks one at a time. Errors go to report(), never out as an unhandled rejection. */
	private enqueue(task: () => Promise<void>, isSwitch: boolean): void {
		if (this.stopped) return;

		this.working++;
		this.queue = this.queue
			.then(async () => {
				if (this.stopped) return;

				// the read from the start of the press may still be going, wait for it so reads never overlap
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

		const target = ((current % count) + 1) as Profile; // next profile, after the last one comes profile 1
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
	 * Flashes the new profile's light: off and back on (or on and back off if its light is off), then puts back
	 * exactly the bytes it read.
	 *
	 * It edits the raw report instead of using LightingSettingsBuilder, because rebuilding the report can change other
	 * settings (a light turned off with the mouse's light button comes back on, an odd sleep value gets replaced, an
	 * odd key response throws). The lighting is read after the switch, so it's the new profile's own for sure.
	 */
	private async flash(profile: Profile): Promise<void> {
		const read = await this.driver.getFeatureReport(
			ReportId.LIGHTING_SETTINGS,
			ReportReadLength.LIGHTING_SETTINGS,
			profile,
		);
		if (!checksumOk(read, 3, 10, 11))
			throw new DriverError("the lighting the mouse sent back has a bad checksum, so it won't flash");

		const original = new Uint8Array(read);
		original[2] = profile; // goes back to the new profile
		const lightIsOff = (original[3] ?? 0) >> 4 === LightMode.Off;
		const flashed = new Uint8Array(original);
		flashed[3] = (lightIsOff ? LightMode.Static : LightMode.Off) << 4;
		writeChecksum(flashed, 3, 10, 11);

		const write = async (report: Uint8Array): Promise<void> => {
			const confirmation = await this.driver.sendCommand(ReportId.LIGHTING_SETTINGS, report);
			if (confirmation !== CommandConfirmation.Success)
				throw new SendCommandError('the mouse rejected a light change while flashing');
		};

		let restored = true;
		try {
			for (let i = 0; i < this.flashes; i++) {
				restored = false;
				await write(flashed);
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

	/**
	 * Moves to the next DPI stage that's turned on, wrapping around at the end. Like the flash, it only changes the
	 * stage byte of the report it read (rebuilding it with DpiBuilder would also reset byte 49).
	 */
	private async cycleDpiStage(): Promise<void> {
		const { current } = await this.takeProfileState();
		const read = await this.driver.getFeatureReport(ReportId.DPI, ReportReadLength.DPI, current);
		if (!checksumOk(read, 3, 49, 50))
			throw new DriverError("the DPI settings the mouse sent back have a bad checksum, so they won't be changed");

		const active = read[5] ?? 0;
		const stage = read[24] ?? 0;
		let next: number = stage;
		for (let step = 1; step <= 8; step++) {
			const candidate = ((stage - 1 + step) % 8) + 1;
			if (active & (1 << (candidate - 1))) {
				next = candidate;
				break;
			}
		}
		if (next === stage) return; // only one stage is on, nothing to change

		const report = new Uint8Array(read);
		report[2] = current; // goes back to the active profile
		report[24] = next;
		writeChecksum(report, 3, 49, 50);
		const confirmation = await this.driver.sendCommand(ReportId.DPI, report);
		if (confirmation !== CommandConfirmation.Success)
			throw new SendCommandError('the mouse rejected the DPI stage change');
	}
}

/** Puts the 16-bit sum of bytes `from` to `to` at `at` (high byte first), the checksum lighting and DPI reports use. */
function writeChecksum(report: Uint8Array, from: number, to: number, at: number): void {
	let sum = 0;
	for (let i = from; i <= to; i++) sum += report[i] ?? 0;
	report[at] = (sum >> 8) & 0xff;
	report[at + 1] = sum & 0xff;
}

/** True if the checksum at `at` matches, so it's a real report and not garbage. */
function checksumOk(report: Uint8Array, from: number, to: number, at: number): boolean {
	let sum = 0;
	for (let i = from; i <= to; i++) sum += report[i] ?? 0;
	return report.length > at + 1 && (((report[at] ?? 0) << 8) | (report[at + 1] ?? 0)) === sum;
}

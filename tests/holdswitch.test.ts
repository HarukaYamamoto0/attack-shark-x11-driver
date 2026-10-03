// Run with `bun test`. Holding a button to switch profile, against a pretend mouse that sends button events.
import { describe, expect, test } from 'bun:test';
import type { AttackSharkX11 } from '../src/core/AttackSharkX11';
import { ParamsError, SendCommandError } from '../src/errors';
import { ButtonMapping } from '../src/protocols/ButtonMappingBuilder';
import { LightMode } from '../src/protocols/LightingSettingsBuilder';
import { FirmwareAction } from '../src/core/keyboard-keypad-page';
import { handleButtonEvent } from '../src/handles/messages/handleButtonEvent';
import { Profile, ReportId } from '../src/types';
import { MemoryMouse, openWith } from './memory-mouse';

const DPI_BUTTON = ButtonMapping.Slot6;
const DPI_BUTTON_ID = 8; // where the firmware keeps the DPI button after a write, it doesn't matter for these tests
const changes = (mouse: MemoryMouse, from: number): Uint8Array[] =>
	mouse.writes.slice(from).filter((w) => w[0] !== 0xa0);
const modeOf = (report: Uint8Array): number => (report[3] ?? 0) >> 4;
const byteSum = (b: Uint8Array, from: number, to: number): number => b.slice(from, to + 1).reduce((a, x) => a + x, 0);
const word = (b: Uint8Array, at: number): number => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);

async function until(done: () => boolean, ms = 2000): Promise<void> {
	const end = Date.now() + ms;
	while (!done()) {
		if (Date.now() > end) throw new Error('timed out waiting');
		await Bun.sleep(5);
	}
}

/** A mouse with `count` profiles set up, the DPI button reporting its presses, profile 1 active. */
async function ready(
	count = 3,
	lightMode = LightMode.StaticDpi,
	dpi: object = {},
): Promise<{ mouse: MemoryMouse; driver: AttackSharkX11; mark: number }> {
	const mouse = new MemoryMouse();
	const driver = await openWith(mouse);
	await driver.setupProfiles({
		holdButton: DPI_BUTTON,
		profiles: Array.from({ length: count }, () => ({ lighting: { lightMode }, dpi })),
	});
	return { mouse, driver, mark: mouse.writes.length };
}

const quick = { holdMs: 60, flashMs: 20 };

describe('holding the button', () => {
	test('switches to the next profile and flashes the light 3 times, ending on the profile light mode', async () => {
		const { mouse, driver, mark } = await ready();
		const switched: Profile[] = [];
		const stop = driver.startHoldSwitch({ ...quick, onSwitch: (p) => void switched.push(p) });

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length >= 6);
		mouse.release(DPI_BUTTON_ID);
		await Bun.sleep(800); // a wrong DPI cycle would take about half a second to show up

		expect(mouse.state).toEqual({ current: 2, max: 3 });
		expect(switched).toEqual([2]);
		const flashes = mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark);
		expect(flashes.map(modeOf)).toEqual([0, 5, 0, 5, 0, 5]); // off, back, off, back, off, back
		for (const write of flashes) {
			expect(write[2]).toBe(2); // all of it to the profile that's active now
			expect(word(write, 11)).toBe(byteSum(write, 3, 10));
		}
		expect(modeOf(mouse.storedReport(ReportId.LIGHTING_SETTINGS, 2))).toBe(5);
		expect(mouse.writesOf(ReportId.DPI, mark).length).toBe(0); // letting go afterwards is not a short press
		stop();
	});

	test('the flash is written to the active profile even when the lighting it read says another one', async () => {
		const { mouse, driver, mark } = await ready();
		mouse.storedReport(ReportId.LIGHTING_SETTINGS, 2)[2] = 1; // like a profile that holds the built-in defaults
		const stop = driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length >= 6);

		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).map((w) => w[2])).toEqual([2, 2, 2, 2, 2, 2]);
		expect(mouse.storedReport(ReportId.LIGHTING_SETTINGS, 1)[2]).toBe(1); // profile 1 is untouched
		stop();
	});

	test('from the last profile it goes back to profile 1', async () => {
		const { mouse, driver } = await ready(3);
		await driver.switchProfile(Profile.Profile3);
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0 });

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.state.current === 1);
		stop();
	});

	test('when the light is off in the profile it flashes on and ends off', async () => {
		const { mouse, driver, mark } = await ready(2, LightMode.Off);
		const stop = driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length >= 6);

		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).map(modeOf)).toEqual([1, 0, 1, 0, 1, 0]);
		expect(modeOf(mouse.storedReport(ReportId.LIGHTING_SETTINGS, 2))).toBe(0);
		stop();
	});

	test('flashes: 0 only switches', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0 });

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.state.current === 2);
		await Bun.sleep(80);

		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length).toBe(0);
		stop();
	});

	test('the same press reported twice only switches once', async () => {
		const { mouse, driver, mark } = await ready(5);
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0 });

		mouse.press(DPI_BUTTON_ID);
		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.state.current === 2);
		await Bun.sleep(150);

		expect(mouse.state.current).toBe(2);
		expect(mouse.writesOf(ReportId.PROFILE_SETTING, mark).length).toBe(1);
		stop();
	});

	test('a press while it is still switching and flashing is left alone, both the hold and the let go', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch({ ...quick, flashMs: 40 });

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.state.current === 2);
		mouse.release(DPI_BUTTON_ID); // let go of the hold, the flash is still going
		mouse.press(DPI_BUTTON_ID); // and a new press during the flash
		mouse.release(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length >= 6);
		await Bun.sleep(900); // a press that wasn't ignored would cycle the DPI or switch again within this time

		expect(mouse.state.current).toBe(2);
		expect(mouse.writesOf(ReportId.DPI, mark).length).toBe(0);
		stop();
	});

	test('the profile is read while the button is down, so the switch is not late', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch({ holdMs: 700, flashes: 0 });

		const pressedAt = Date.now();
		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.PROFILE_SETTING, mark).length === 1);
		const lateBy = Date.now() - pressedAt - 700;

		expect(lateBy).toBeLessThan(150); // the 250 ms read was done during the 700 ms of holding
		expect(mouse.writesOf(0xa0, mark).length).toBe(1); // and it was the only read before the switch
		stop();
	});

	test('with one profile enabled there is nothing to switch to, and it says so', async () => {
		const { mouse, driver, mark } = await ready(1);
		const errors: Error[] = [];
		const stop = driver.startHoldSwitch({ ...quick, onError: (e) => void errors.push(e) });

		mouse.press(DPI_BUTTON_ID);
		await until(() => errors.length === 1);

		expect(errors[0]?.message).toContain('only one profile');
		expect(mouse.writesOf(ReportId.PROFILE_SETTING, mark).length).toBe(0);
		stop();
	});

	test('only the button given in buttonId counts', async () => {
		const { mouse, driver } = await ready();
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0, buttonId: 8 });

		mouse.press(3);
		await Bun.sleep(150);
		expect(mouse.state.current).toBe(1);

		mouse.release(3);
		mouse.press(8);
		await until(() => mouse.state.current === 2);
		stop();
	});
});

describe('a short press', () => {
	test('cycles the DPI stage of the active profile and leaves the profile and the light alone', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		await Bun.sleep(10);
		mouse.release(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.DPI, mark).length >= 1);

		const [write] = mouse.writesOf(ReportId.DPI, mark);
		expect(write?.[24]).toBe(3); // the default current stage is 2
		expect(write?.[2]).toBe(1);
		expect(word(write ?? new Uint8Array(), 50)).toBe(byteSum(write ?? new Uint8Array(), 3, 49));
		expect(mouse.state).toEqual({ current: 1, max: 3 });
		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).length).toBe(0);
		stop();
	});

	test('the DPI change is written to the active profile even when the DPI it read says another one', async () => {
		const { mouse, driver, mark } = await ready();
		mouse.storedReport(ReportId.DPI, 1)[2] = 3;
		const stop = driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		mouse.release(DPI_BUTTON_ID);
		await until(() => mouse.writesOf(ReportId.DPI, mark).length >= 1);

		expect(mouse.writesOf(ReportId.DPI, mark)[0]?.[2]).toBe(1);
		stop();
	});

	test('goes round the stages that are on, skipping the ones that are off and wrapping at the end', async () => {
		const { mouse, driver, mark } = await ready(2, LightMode.StaticDpi, {
			activeStages: 0b100101,
			currentStage: 3,
		});
		const stop = driver.startHoldSwitch(quick);

		const stages: number[] = [];
		for (let i = 0; i < 3; i++) {
			const before = mouse.writesOf(ReportId.DPI, mark).length;
			mouse.press(DPI_BUTTON_ID);
			mouse.release(DPI_BUTTON_ID);
			await until(() => mouse.writesOf(ReportId.DPI, mark).length > before);
			await Bun.sleep(10);
			stages.push(mouse.writesOf(ReportId.DPI, mark).at(-1)?.[24] ?? 0);
		}

		expect(stages).toEqual([6, 1, 3]); // stages 1, 3 and 6 are on
		stop();
	});

	test('quick presses one after another are all counted, not dropped', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch(quick);

		for (let i = 0; i < 3; i++) {
			mouse.press(DPI_BUTTON_ID);
			mouse.release(DPI_BUTTON_ID);
			await Bun.sleep(15);
		}
		await until(() => mouse.writesOf(ReportId.DPI, mark).length >= 3, 4000);

		expect(mouse.writesOf(ReportId.DPI, mark).map((w) => w[24])).toEqual([3, 4, 5]); // 2 -> 3 -> 4 -> 5
		stop();
	});

	test('mashing the button does not build up a queue', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch(quick);

		for (let i = 0; i < 12; i++) {
			mouse.press(DPI_BUTTON_ID);
			mouse.release(DPI_BUTTON_ID);
		}
		await Bun.sleep(3500);

		expect(mouse.writesOf(ReportId.DPI, mark).length).toBeLessThanOrEqual(4);
		expect(mouse.writesOf(ReportId.DPI, mark).length).toBeGreaterThanOrEqual(1);
		stop();
	});

	test('with one stage on there is nothing to cycle', async () => {
		const { mouse, driver, mark } = await ready(2, LightMode.StaticDpi, { activeStages: 0b10, currentStage: 2 });
		const stop = driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		mouse.release(DPI_BUTTON_ID);
		await Bun.sleep(100);

		expect(mouse.writesOf(ReportId.DPI, mark).length).toBe(0);
		stop();
	});

	test("onShortPress 'none' does nothing and a function of your own runs", async () => {
		const { mouse, driver, mark } = await ready();
		const stopNone = driver.startHoldSwitch({ ...quick, onShortPress: 'none' });
		mouse.press(DPI_BUTTON_ID);
		mouse.release(DPI_BUTTON_ID);
		await Bun.sleep(100);
		expect(changes(mouse, mark).length).toBe(0);
		stopNone();

		let calls = 0;
		const stopCustom = driver.startHoldSwitch({ ...quick, onShortPress: () => void calls++ });
		mouse.press(DPI_BUTTON_ID);
		mouse.release(DPI_BUTTON_ID);
		await until(() => calls === 1);
		stopCustom();
	});
});

describe('when things go wrong', () => {
	test('a rejected switch goes to onError and the next hold works', async () => {
		const { mouse, driver } = await ready();
		let failOnce = true;
		mouse.statusFor = (report): number => {
			if (report[0] === ReportId.PROFILE_SETTING && failOnce) {
				failOnce = false;
				return 0x01;
			}
			return 0x00;
		};
		const errors: Error[] = [];
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0, onError: (e) => void errors.push(e) });

		mouse.press(DPI_BUTTON_ID);
		await until(() => errors.length === 1);
		mouse.release(DPI_BUTTON_ID);
		expect(errors[0]).toBeInstanceOf(SendCommandError);
		expect(mouse.state.current).toBe(1);

		mouse.press(DPI_BUTTON_ID);
		await until(() => mouse.state.current === 2);
		stop();
	});

	test('a flash that fails half way still puts the light mode back', async () => {
		const { mouse, driver, mark } = await ready();
		const errors: Error[] = [];
		let lightWrites = 0;
		mouse.statusFor = (report): number =>
			report[0] === ReportId.LIGHTING_SETTINGS && ++lightWrites === 2 ? 0x01 : 0x00;
		const stop = driver.startHoldSwitch({ ...quick, onError: (e) => void errors.push(e) });

		mouse.press(DPI_BUTTON_ID);
		await until(() => errors.length === 1);
		await Bun.sleep(30);

		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, mark).map(modeOf)).toEqual([0, 5, 5]); // off, rejected, put back
		expect(modeOf(mouse.storedReport(ReportId.LIGHTING_SETTINGS, 2))).toBe(5);
		stop();
	});

	test('without onError the error is emitted on the driver when something listens, and nothing crashes', async () => {
		const { mouse, driver } = await ready();
		mouse.statusFor = (report): number => (report[0] === ReportId.PROFILE_SETTING ? 0x01 : 0x00);
		const emitted: Error[] = [];
		driver.on('error', (e) => void emitted.push(e));
		const stop = driver.startHoldSwitch({ ...quick, flashes: 0 });

		mouse.press(DPI_BUTTON_ID);
		await until(() => emitted.length === 1);
		stop();
	});
});

describe('stopping', () => {
	test('stop() ends it', async () => {
		const { mouse, driver, mark } = await ready();
		const stop = driver.startHoldSwitch(quick);
		stop();

		mouse.press(DPI_BUTTON_ID);
		await Bun.sleep(150);
		mouse.release(DPI_BUTTON_ID);
		expect(changes(mouse, mark).length).toBe(0);
	});

	test('close() ends it too, even in the middle of a hold', async () => {
		const { mouse, driver, mark } = await ready();
		driver.startHoldSwitch(quick);

		mouse.press(DPI_BUTTON_ID);
		await Bun.sleep(20);
		await driver.close();
		await Bun.sleep(700); // long enough for the hold to have switched if close() hadn't stopped it

		expect(changes(mouse, mark).length).toBe(0);
	});

	test('the options are checked', () => {
		const mouse = new MemoryMouse();
		const driver = openWith(mouse);
		const bad = [{ holdMs: 10 }, { flashes: 11 }, { flashes: 1.5 }, { flashMs: 5 }];
		return driver.then((d) => {
			for (const options of bad) expect(() => d.startHoldSwitch(options)).toThrow(ParamsError);
		});
	});
});

describe('events and setup', () => {
	test('the driver emits buttonEvent for 03 00 30 <button> <state> and ignores a bad state', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		const events: [number, boolean][] = [];
		driver.on('buttonEvent', (id, pressed) => void events.push([id, pressed]));

		mouse.press(8);
		mouse.release(8);
		mouse.press(2);
		mouse.sendEvent([0x03, 0x00, 0x30, 9, 0x02]); // not a press or a release
		expect(events).toEqual([
			[8, true],
			[8, false],
			[2, true],
		]);
		expect(handleButtonEvent(8, 1)).toEqual({ id: 8, pressed: true });
		expect(() => handleButtonEvent(8, 2)).toThrow(ParamsError);
	});

	test('setupProfiles puts REPORT_BUTTON on the hold button in every profile and leaves the others alone', async () => {
		const { mouse } = await ready(3);

		for (const profile of [1, 2, 3]) {
			const buttons = mouse.storedReport(ReportId.BUTTON_MAPPING, profile);
			expect([...buttons.subarray(18, 21)]).toEqual([FirmwareAction.REPORT_BUTTON, 0, 0]); // slot 6
			expect([...buttons.subarray(3, 6)]).toEqual([FirmwareAction.LEFT_CLICK, 0, 0]); // slot 1
			expect([...buttons.subarray(24, 27)]).toEqual([FirmwareAction.BACKWARD, 0, 0]); // slot 8
			expect(word(buttons, 57)).toBe(byteSum(buttons, 3, 56));
		}
	});

	test('setupProfiles without holdButton gives the DPI button its DPI cycle back', async () => {
		const { mouse, driver } = await ready(2);
		await driver.setupProfiles({ profiles: [{}, {}] });

		for (const profile of [1, 2])
			expect(mouse.storedReport(ReportId.BUTTON_MAPPING, profile)[18]).toBe(FirmwareAction.GLOBAL_DPI_CYCLE);
	});

	test('switchButton and holdButton can be different buttons together, but not the same one', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		await driver.setupProfiles({ profiles: [{}, {}], holdButton: DPI_BUTTON, switchButton: ButtonMapping.Slot7 });
		const buttons = mouse.storedReport(ReportId.BUTTON_MAPPING, 2);
		expect([buttons[18], buttons[21]]).toEqual([FirmwareAction.REPORT_BUTTON, FirmwareAction.PROFILE_CYCLE]);

		await expect(
			driver.setupProfiles({ profiles: [{}], holdButton: DPI_BUTTON, switchButton: DPI_BUTTON }),
		).rejects.toBeInstanceOf(ParamsError);
	});

	test("a profile can take a DpiBuilder or lighting you read, and it's written to each profile with its own id", async () => {
		const { mouse, driver } = await ready(1, LightMode.Breathing, {
			dpiValues: [400, 800, 1200, 1600, 0, 0, 0, 0],
		});
		const dpi = await driver.getDpi(1);
		const lighting = await driver.getLightingSettings(1);
		const before = mouse.writes.length;

		await driver.setupProfiles({
			holdButton: DPI_BUTTON,
			profiles: [
				{ dpi, lighting },
				{ dpi, lighting },
				{ dpi, lighting },
			],
		});

		expect(mouse.writesOf(ReportId.DPI, before).map((w) => w[2])).toEqual([1, 2, 3]);
		expect(mouse.writesOf(ReportId.LIGHTING_SETTINGS, before).map((w) => w[2])).toEqual([1, 2, 3]);
		for (const profile of [1, 2, 3]) {
			expect(modeOf(mouse.storedReport(ReportId.LIGHTING_SETTINGS, profile))).toBe(LightMode.Breathing);
			expect((await driver.getDpi(profile)).getDpiValues().slice(0, 4)).toEqual([400, 800, 1200, 1600]);
		}
	});
});

describe('reads of the mouse never overlap', () => {
	test('your own onShortPress function can read right after a press', async () => {
		const { mouse, driver } = await ready();
		let result: Error | string = 'not run';
		const stop = driver.startHoldSwitch({
			...quick,
			onShortPress: async () => {
				try {
					await driver.getDpi(1); // the read from the start of the press has to be over by now
					result = 'read fine';
				} catch (error) {
					result = error as Error;
				}
			},
		});

		mouse.press(DPI_BUTTON_ID);
		mouse.release(DPI_BUTTON_ID);
		await until(() => result !== 'not run');

		expect(result).toBe('read fine');
		stop();
	});
});

describe('scripts/hold-switch.ts', () => {
	test('setup copies profile 1 into the others with the DPI button reporting, undo gives it its DPI cycle back', async () => {
		const { setup } = await import('../scripts/hold-switch');
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		await driver.setupProfiles({
			profiles: [{ lighting: { lightMode: LightMode.Breathing }, pollingRate: 500 }, {}],
			switchButton: ButtonMapping.Slot7,
		});

		await setup(driver, 3, true);

		for (const profile of [1, 2, 3]) {
			expect(mouse.storedReport(ReportId.BUTTON_MAPPING, profile)[18]).toBe(FirmwareAction.REPORT_BUTTON);
			expect(mouse.storedReport(ReportId.BUTTON_MAPPING, profile)[21]).toBe(FirmwareAction.FORWARD); // buttons reset
			expect(modeOf(mouse.storedReport(ReportId.LIGHTING_SETTINGS, profile))).toBe(LightMode.Breathing);
			expect(mouse.storedReport(ReportId.POLLING_RATE, profile)[3]).toBe(0x02); // 500 Hz
			expect(mouse.storedReport(ReportId.LIGHTING_SETTINGS, profile)[2]).toBe(profile);
		}
		expect(mouse.state).toEqual({ current: 1, max: 3 });

		await setup(driver, 3, false);
		for (const profile of [1, 2, 3])
			expect(mouse.storedReport(ReportId.BUTTON_MAPPING, profile)[18]).toBe(FirmwareAction.GLOBAL_DPI_CYCLE);
	});

	test('it reads everything before it writes anything', async () => {
		const { setup } = await import('../scripts/hold-switch');
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse); // nothing stored: the read of profile 1 fails
		const before = mouse.writes.length;

		await expect(setup(driver, 2, true)).rejects.toThrow();
		expect(mouse.writes.slice(before).filter((w) => w[0] !== 0xa0).length).toBe(0);
	});
});

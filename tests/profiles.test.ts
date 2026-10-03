// Run with `bun test`. Profile helpers against a pretend mouse that keeps every profile's reports separately.
import { describe, expect, test } from 'bun:test';
import { AttackSharkX11 } from '../src/core/AttackSharkX11';
import type { MouseTransport } from '../src/core/transport';
import { ParamsError } from '../src/errors';
import { ButtonMapping } from '../src/protocols/ButtonMappingBuilder';
import { Rate } from '../src/protocols/PollingRateBuilder';
import { FirmwareAction } from '../src/core/keyboard-keypad-page';
import { Profile, ReportId } from '../src/types';

const byteSum = (b: Uint8Array, from: number, to: number): number => b.slice(from, to + 1).reduce((a, x) => a + x, 0);
const word = (b: Uint8Array, at: number): number => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);

/** Stores each settings report under its profile byte, reads them back by the profile in the read request. */
class MemoryMouse implements MouseTransport {
	stored = new Map<string, Uint8Array>();
	state = { current: 1, max: 1 };
	writes: Uint8Array[] = [];
	private readParameter = 1;
	private listener: ((data: Uint8Array) => void) | null = null;

	open(): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	sendFeatureReport(data: Uint8Array): Promise<number> {
		const copy = new Uint8Array(data);
		this.writes.push(copy);
		const id = copy[0] ?? 0;
		if (id === 0xa0) {
			this.readParameter = copy[4] ?? 0;
			return Promise.resolve(copy.length);
		}
		if (id === ReportId.PROFILE_SETTING) this.state = { current: copy[2] ?? 0, max: copy[4] ?? 0 };
		else this.stored.set(`${id}:${copy[2]}`, copy);
		setTimeout(() => this.listener?.(new Uint8Array([0x03, 0x55, 0x50, 0x00, id])), 2);
		return Promise.resolve(copy.length);
	}

	getFeatureReport(reportId: number, length: number): Promise<Uint8Array> {
		const response = new Uint8Array(length);
		if (reportId === 0xa0) response.set([0xa0, 0x01]);
		else if (reportId === ReportId.PROFILE_SETTING) {
			const { current, max } = this.state;
			response.set([0x0c, 0x0a, current, ~current & 0xff, max, ~max & 0xff]);
		} else
			response.set(
				(this.stored.get(`${reportId}:${this.readParameter}`) ?? new Uint8Array()).subarray(0, length),
			);
		return Promise.resolve(response);
	}

	onData(listener: (data: Uint8Array) => void): void {
		this.listener = listener;
	}

	onError(): void {
		// the pretend mouse never errors
	}

	storedReport(reportId: number, profile: number): Uint8Array {
		return this.stored.get(`${reportId}:${profile}`) ?? new Uint8Array();
	}
}

async function openWith(mouse: MemoryMouse): Promise<AttackSharkX11> {
	const driver = new AttackSharkX11({ transport: mouse });
	await driver.open();
	return driver;
}

const threeProfiles = {
	switchButton: ButtonMapping.Slot8,
	activeProfile: Profile.Profile2,
	profiles: [
		{ pollingRate: Rate.Office },
		{ lighting: { rgb: { r: 255, g: 0, b: 128 } } },
		{
			dpi: {
				dpiValues: [400, 800, 1600, 3200, 0, 0, 0, 0] as [
					number,
					number,
					number,
					number,
					number,
					number,
					number,
					number,
				],
			},
		},
	],
};

describe('setupProfiles', () => {
	test('writes every report of every profile, with the switch button in each, then the profile count', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		await driver.setupProfiles(threeProfiles);

		for (const profile of [1, 2, 3]) {
			for (const id of [ReportId.DPI, ReportId.LIGHTING_SETTINGS, ReportId.POLLING_RATE, ReportId.BUTTON_MAPPING])
				expect([profile, id, mouse.storedReport(id, profile)[2]]).toEqual([profile, id, profile]);
			const buttons = mouse.storedReport(ReportId.BUTTON_MAPPING, profile);
			expect([...buttons.subarray(24, 27)]).toEqual([FirmwareAction.PROFILE_CYCLE, 0, 0]); // slot 8
			expect(word(buttons, 57)).toBe(byteSum(buttons, 3, 56));
			const light = mouse.storedReport(ReportId.LIGHTING_SETTINGS, profile);
			expect(word(light, 11)).toBe(byteSum(light, 3, 10));
			const dpi = mouse.storedReport(ReportId.DPI, profile);
			expect(word(dpi, 50)).toBe(byteSum(dpi, 3, 49));
		}
		expect(mouse.storedReport(ReportId.POLLING_RATE, 1)[3]).toBe(0x04); // 250 Hz
		expect([...mouse.storedReport(ReportId.LIGHTING_SETTINGS, 2).subarray(6, 9)]).toEqual([255, 0, 128]);
		expect(mouse.state).toEqual({ current: 2, max: 3 });
		expect(mouse.writes.at(-1)?.[0]).toBe(ReportId.PROFILE_SETTING); // the count is enabled last
	});

	test('refuses 0 or 6 profiles and an active profile that is not set up, before writing anything', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		const bad = [
			{ ...threeProfiles, profiles: [] },
			{ ...threeProfiles, profiles: [{}, {}, {}, {}, {}, {}] },
			{ ...threeProfiles, activeProfile: Profile.Profile4 },
		];
		for (const options of bad) await expect(driver.setupProfiles(options)).rejects.toBeInstanceOf(ParamsError);
		expect(mouse.writes.length).toBe(0);
	});
});

describe('switching', () => {
	test('switchProfile keeps the count and refuses a profile that is not enabled', async () => {
		const mouse = new MemoryMouse();
		mouse.state = { current: 1, max: 3 };
		const driver = await openWith(mouse);
		await driver.switchProfile(Profile.Profile3);
		expect(mouse.state).toEqual({ current: 3, max: 3 });
		await expect(driver.switchProfile(Profile.Profile4)).rejects.toBeInstanceOf(ParamsError);
		expect(mouse.state).toEqual({ current: 3, max: 3 });
	});

	test('previousProfile gets to profile 1 and wraps, nextProfile wraps', async () => {
		const mouse = new MemoryMouse();
		mouse.state = { current: 1, max: 3 };
		const driver = await openWith(mouse);
		const visited: number[] = [];
		for (let i = 0; i < 3; i++) visited.push(await driver.previousProfile());
		expect(visited).toEqual([3, 2, 1]);
		expect(await driver.nextProfile()).toBe(Profile.Profile2);
		mouse.state = { current: 3, max: 3 };
		expect(await driver.nextProfile()).toBe(Profile.Profile1);
	});

	test('setProfileCount moves the active profile inside the new count', async () => {
		const mouse = new MemoryMouse();
		mouse.state = { current: 3, max: 3 };
		const driver = await openWith(mouse);
		await driver.setProfileCount(2);
		expect(mouse.state).toEqual({ current: 2, max: 2 });
		await expect(driver.setProfileCount(6)).rejects.toBeInstanceOf(ParamsError);
		expect(await driver.getProfileState()).toEqual({ current: 2, count: 2 });
	});
});

describe('reading', () => {
	test('readProfile asks for that profile and gets its settings back', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		await driver.setupProfiles(threeProfiles);
		const before = mouse.writes.length;

		const third = await driver.readProfile(Profile.Profile3);
		const readRequests = mouse.writes.slice(before).filter((w) => w[0] === 0xa0);
		expect(readRequests.map((w) => w[4])).toEqual([3, 3, 3, 3]);
		expect(third.dpi.getDpiValues().slice(0, 4)).toEqual([400, 800, 1600, 3200]);
		expect(third.pollingRate).toBe(Rate.ESports);
		expect((await driver.readProfile(Profile.Profile1)).pollingRate).toBe(Rate.Office);
	});

	test('the getters still read profile 1 when no profile is given', async () => {
		const mouse = new MemoryMouse();
		const driver = await openWith(mouse);
		await driver.setupProfiles(threeProfiles);
		const before = mouse.writes.length;
		await driver.getDpi();
		expect(mouse.writes.slice(before).find((w) => w[0] === 0xa0)?.[4]).toBe(1);
	});
});

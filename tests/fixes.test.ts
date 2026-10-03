// Run with `bun test`. Everything here runs the real driver code against a fake transport, no mouse needed.
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { AttackSharkX11 } from '../src/core/AttackSharkX11';
import type { MouseTransport } from '../src/core/transport';
import { CommandConfirmation } from '../src/handles/messages/handleCommandConfirmation';
import { handleProfileChanged } from '../src/handles/messages/handleProfileChanged';
import { ConnectionMode, ReportId } from '../src/types';
import { LightingSettingsBuilder, type LightingSettingsBuilderOptions } from '../src/protocols/LightingSettingsBuilder';
import { handleResponseLightingSettings } from '../src/handles/handleResponseLightingSettings';
import { ButtonMapping, ButtonMappingBuilder } from '../src/protocols/ButtonMappingBuilder';
import { handleResponseButtonMapping } from '../src/handles/handleResponseButtonMapping';
import { SlotButton } from '../src/structures/SlotButton';
import { FirmwareAction } from '../src/core/keyboard-keypad-page';
import { handleMacroResponse } from '../src/handles/hadleMacroResponse';
import MacroAction, { MacroActionDirection, MacroActionMouseCode } from '../src/structures/MacroAction';
import { MacroBuilder, MacroType } from '../src/protocols/MacroBuilder';
import { DpiBuilder, dpiBuilderDefaultOptions } from '../src/protocols/DpiBuilder';
import { handleResponseDpi } from '../src/handles/handleResponseDpi';
import { convertBytesToDpi, convertDpiToBytes } from '../src/utils/dpi';
import { DPI_3311 } from '../src/tables/dpi-map';
import { handleResponsePollingRate } from '../src/handles/handleResponsePollingRate';
import { ParamsError } from '../src/errors';
import * as packageRoot from '../src';

const WIRELESS = ConnectionMode.Wireless;
const byteSum = (b: Uint8Array, from: number, to: number): number => b.slice(from, to + 1).reduce((a, x) => a + x, 0);
const word = (b: Uint8Array, at: number): number => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);

let unhandled = 0;
const countUnhandled = (): void => {
	unhandled++;
};
beforeAll(() => {
	process.on('unhandledRejection', countUnhandled);
});
afterAll(() => {
	process.off('unhandledRejection', countUnhandled);
});

/** A pretend mouse: records writes, can fail sends and reads, and lets a test push input messages. */
class FakeTransport implements MouseTransport {
	writes: number[][] = [];
	failSend = false;
	failReadsLeft = 0;
	/** what status the fake acks a write with, null for no ack */
	ack: ((reportId: number) => number | null) | null = (reportId) => (reportId === 0xa0 ? null : 0x00);
	private listener: ((data: Uint8Array) => void) | null = null;

	open(): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	sendFeatureReport(data: Uint8Array): Promise<number> {
		if (this.failSend) return Promise.reject(new Error('EPIPE (simulated cable stall)'));
		this.writes.push([...data]);
		const status = this.ack?.(data[0] ?? 0);
		if (status !== null && status !== undefined) setTimeout(() => this.push(0x50, status, data[0] ?? 0), 5);
		return Promise.resolve(data.length);
	}

	getFeatureReport(reportId: number, length: number): Promise<Uint8Array> {
		if (reportId === 0xa0) return Promise.resolve(new Uint8Array([0xa0, 0x01, 0, 0, 0, 0, 0, 0]));
		if (this.failReadsLeft-- > 0) return Promise.reject(new Error('read stalled'));
		const response = new Uint8Array(length);
		response.set([reportId, length, 0x01, 0x01, 0xfe]);
		return Promise.resolve(response);
	}

	onData(listener: (data: Uint8Array) => void): void {
		this.listener = listener;
	}

	onError(): void {
		// the fake never errors
	}

	push(type: number, params1: number, params2: number): void {
		this.listener?.(new Uint8Array([0x03, 0x55, type, params1, params2]));
	}
}

async function openWith(transport: FakeTransport): Promise<AttackSharkX11> {
	const driver = new AttackSharkX11({ transport });
	await driver.open();
	return driver;
}

const POLLING_1000 = new Uint8Array([0x06, 0x09, 0x01, 0x01, 0xfe, 0, 0, 0, 0]);

describe('commands', () => {
	test('a failed write is thrown to the caller and leaves no unhandled rejection', async () => {
		const transport = new FakeTransport();
		transport.failSend = true;
		const driver = await openWith(transport);
		await expect(driver.setPollingRate({})).rejects.toThrow();
		await Bun.sleep(50);
		expect(unhandled).toBe(0);
	});

	test('report 0x10 is never written', async () => {
		const transport = new FakeTransport();
		const driver = await openWith(transport);
		const bootloader = new Uint8Array(64);
		bootloader[0] = 0x10;
		await expect(driver.sendFeatureReport(bootloader)).rejects.toThrow();
		expect(transport.writes.length).toBe(0);
		expect(await driver.sendFeatureReport(POLLING_1000)).toBe(9);
	});

	test('a late confirmation for another report does not fail the pending command', async () => {
		const transport = new FakeTransport();
		transport.ack = null;
		const driver = await openWith(transport);
		const pending = driver.sendCommand(ReportId.LIGHTING_SETTINGS, new LightingSettingsBuilder().build(WIRELESS));
		await Bun.sleep(5);
		transport.push(0x50, 0x00, ReportId.POLLING_RATE); // a stray ack
		transport.push(0x50, 0x00, ReportId.LIGHTING_SETTINGS); // ours
		expect(await pending).toBe(CommandConfirmation.Success);
	});

	test('a failed read does not leave the read permission set', async () => {
		const transport = new FakeTransport();
		const driver = await openWith(transport);
		transport.failReadsLeft = 1;
		await expect(driver.getPollingRate()).rejects.toThrow();
		await driver.getPollingRate();
		expect(transport.writes.filter((w) => w[0] === 0xa0).length).toBe(2); // asked again the second time
	});

	test('setMacro reports a rejected page', async () => {
		const transport = new FakeTransport();
		let page = 0;
		transport.ack = (reportId): number | null => (reportId === 0xa0 ? null : page++ === 1 ? 0x01 : 0x00);
		const driver = await openWith(transport);
		const macro = { id: 1, type: MacroType.FIXED_LOOP, macroGunRGB: { r: 0, g: 0, b: 0 }, loopTimes: 1 };
		expect(await driver.setMacro(macro)).toBe(CommandConfirmation.Failure);
	});

	test('initializeProfile stops when the mouse rejects a step', async () => {
		const transport = new FakeTransport();
		transport.ack = (reportId): number | null =>
			reportId === 0xa0 ? null : reportId === ReportId.LIGHTING_SETTINGS ? 0x01 : 0x00;
		const driver = await openWith(transport);
		const config = { profileId: 1, currentProfileId: 1, maxProfileCount: 1, timeoutMs: 500 };
		await expect(driver.initializeProfile(config)).rejects.toThrow();
		await Bun.sleep(100);
		expect(transport.writes.some((w) => w[0] === ReportId.BUTTON_MAPPING)).toBe(false);
	});

	test('close() fails the pending command instead of leaving its timer running', async () => {
		const transport = new FakeTransport();
		transport.ack = null;
		const driver = await openWith(transport);
		const pending = driver.sendCommand(ReportId.POLLING_RATE, POLLING_1000, 300);
		await Bun.sleep(5);
		await driver.close();
		await expect(pending).rejects.toThrow('closed');
		await Bun.sleep(350);
		expect(unhandled).toBe(0);
	});
});

describe('lighting', () => {
	test('build() recalculates the checksum after a setter', () => {
		const white = { rgb: { r: 255, g: 255, b: 255 } } as LightingSettingsBuilderOptions;
		const packet = new LightingSettingsBuilder(white).build(WIRELESS);
		expect(word(packet, 11)).toBe(byteSum(packet, 3, 10));
	});

	test('read -> write keeps the light mode', () => {
		for (const lightMode of [1, 2, 3, 4, 5, 6]) {
			const options = { lightMode } as LightingSettingsBuilderOptions;
			const written = new LightingSettingsBuilder(options).build(WIRELESS);
			const back = handleResponseLightingSettings(new Uint8Array(written)).build(WIRELESS);
			expect(back[3]).toBe(written[3]);
		}
	});
});

describe('buttons', () => {
	test('the checksum is a 16-bit sum of bytes 3-56, also when built twice', () => {
		const builder = new ButtonMappingBuilder();
		expect(word(builder.build(WIRELESS), 57)).toBe(0x003e);
		expect(word(builder.build(WIRELESS), 57)).toBe(0x003e);
	});

	test('the checksum carries over 255', () => {
		const builder = new ButtonMappingBuilder();
		for (const slot of [ButtonMapping.Slot4, ButtonMapping.Slot5, ButtonMapping.Slot9])
			builder.setButton(slot, new SlotButton(FirmwareAction.KEYBOARD, 0x00, 0x45)); // F12
		const packet = builder.build(WIRELESS);
		expect(word(packet, 57)).toBe(byteSum(packet, 3, 56));
		expect(word(packet, 57)).toBe(0x013d);
	});

	test('read -> write gives a valid checksum', () => {
		const rebuilt = handleResponseButtonMapping(new Uint8Array(new ButtonMappingBuilder().build(WIRELESS))).build(
			WIRELESS,
		);
		expect(word(rebuilt, 57)).toBe(byteSum(rebuilt, 3, 56));
	});
});

describe('macros', () => {
	test('a full 100-byte macro reads back without a RangeError', () => {
		const response = new Uint8Array(131);
		response.set([0x09, 0x83, 0x01]);
		for (let i = 29; i < 129; i += 2) response.set([0x01, 0x04], i); // 10 ms, A pressed
		const total = byteSum(response, 3, 128);
		response.set([total & 0xff, total >> 8], 129);
		expect(() => handleMacroResponse(response)).not.toThrow();
	});

	test('setButton() changes the key byte', () => {
		const action = new MacroAction({
			direction: MacroActionDirection.Pressed,
			button: MacroActionMouseCode.LEFT_BUTTON,
			delay: 10,
		});
		action.setButton(MacroActionMouseCode.RIGHT_BUTTON);
		expect(action.toBuffer()[1]).toBe(MacroActionMouseCode.RIGHT_BUTTON);
	});

	test('getName() returns all 20 bytes', () => {
		const name = 'abcdefghijklmnopqrst';
		const color = { r: 0, g: 0, b: 0 };
		const macro = new MacroBuilder({ id: 1, type: MacroType.FIXED_LOOP, macroGunRGB: color, loopTimes: 1, name });
		expect(macro.getName()).toBe(name);
	});
});

describe('dpi', () => {
	// the vendor software's encoder (from HolyJoey's notes on it)
	const vendor = (dpi: number): [number, number, boolean] => {
		if (dpi <= 10000) return [DPI_3311[(dpi - 50) / 50] ?? -1, 0, false];
		if (dpi <= 12000) return [DPI_3311[199 + (dpi - 10000) / 100] ?? -1, 1, false];
		const half = dpi / 2;
		if (half <= 10000) return [DPI_3311[(half - 50) / 50] ?? -1, 0, true];
		return [DPI_3311[199 + (half - 10000) / 100] ?? -1, 1, true];
	};
	const vendorDpis = [
		...Array.from({ length: 200 }, (_, i) => 50 + i * 50),
		...Array.from({ length: 100 }, (_, i) => 10100 + i * 100),
		...Array.from({ length: 10 }, (_, i) => 20200 + i * 200),
	];

	test('every vendor DPI reads back as itself', () => {
		for (const dpi of vendorDpis) {
			const { xByte, yByte, isDouble } = convertDpiToBytes(dpi);
			expect([dpi, convertBytesToDpi(xByte, yByte, isDouble, false)]).toEqual([dpi, dpi]);
		}
	});

	test('above 20000 the bytes are the vendor ones', () => {
		for (const dpi of vendorDpis.filter((d) => d > 20000)) {
			const { xByte, yByte, isDouble } = convertDpiToBytes(dpi);
			expect([dpi, xByte, yByte, isDouble]).toEqual([dpi, ...vendor(dpi)]);
		}
		expect(convertDpiToBytes(22000)).toMatchObject({ xByte: 0x81, yByte: 1, isDouble: true });
	});

	test('odd hundreds above 20000 snap to a neighbour that reads back right', () => {
		for (const dpi of [20300, 20500, 21900]) {
			const { xByte, yByte, isDouble } = convertDpiToBytes(dpi);
			expect(Math.abs(convertBytesToDpi(xByte, yByte, isDouble, false) - dpi)).toBe(100);
		}
	});

	test('the default stages set one by one give the packet the vendor software sends', () => {
		const vendorPacket = new DpiBuilder().build(WIRELESS); // the captured default, stage masks 0x20 0x20
		const viaSetters = new DpiBuilder({ dpiValues: dpiBuilderDefaultOptions.dpiValues }).build(WIRELESS);
		expect([...viaSetters]).toEqual([...vendorPacket]);
	});

	test('read -> write gives back the same DPI packet', () => {
		const original = new DpiBuilder().build(WIRELESS);
		const rebuilt = handleResponseDpi(new Uint8Array(original)).build(WIRELESS);
		expect([...rebuilt]).toEqual([...original]);
	});
});

describe('messages and handlers', () => {
	test('profile changed: params1 is 0-based, 0x00-0x04', () => {
		expect([0, 1, 2, 3, 4].map((p) => handleProfileChanged(p, 0))).toEqual([1, 2, 3, 4, 5]);
		expect(() => handleProfileChanged(5, 0)).toThrow();
	});

	test('a response that is a slice of a bigger buffer is read at its own offset', () => {
		const big = new Uint8Array(32);
		big.set([0x06, 0x09, 0x01, 0x02, 0xfd, 0, 0, 0, 0], 16);
		expect(handleResponsePollingRate(big.subarray(16, 25))).toBe(500);
	});
});

describe('package', () => {
	test('error messages keep their text and name the parameter', () => {
		let error: unknown;
		try {
			handleResponsePollingRate(new Uint8Array(3));
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ParamsError);
		expect((error as ParamsError).paramName).toBe('buffer');
		expect((error as ParamsError).message).toStartWith('Invalid polling rate buffer size');
	});

	test('the package root exports what the README and the option types need', () => {
		const needed = [
			'CommandConfirmation', // README quick start
			'SlotButton', // ButtonMappingBuilderOptions slots
			'FirmwareAction',
			'KeyCode',
			'Modifiers',
			'MacroBuilder', // setMacro()
			'MacroAction',
			'MacroType',
			'ProfileSettingsBuilder', // setProfileSettings()
			'HidTransport', // custom transports
			'handleResponseDpi', // "generating, parsing, and manipulating protocol buffers" for Tauri
			'handleResponseButtonMapping',
			'handleResponseLightingSettings',
			'handleResponsePollingRate',
			'handleMacroResponse',
			'handleProfileSettings',
		];
		expect(needed.filter((name) => !(name in packageRoot))).toEqual([]);
	});
});

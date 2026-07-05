import { describe, expect, it } from 'bun:test';
import { ConnectionMode, LightMode, LightingSettingsBuilder } from '../src';
import { ParamsError } from '../src';

describe('LightingSettingsBuilder', () => {
	it('should initialize with correct default values', () => {
		const builder = new LightingSettingsBuilder();
		const buffer = builder.build(ConnectionMode.Adapter);

		// Header
		expect(buffer[0]).toBe(0x05); // Report ID
		expect(buffer[1]).toBe(0x0f); // Length
		expect(buffer[2]).toBe(0x01); // Profile ID

		// Default values
		expect(builder.lightMode).toBe(LightMode.Off);
		expect(builder.ledSpeed).toBe(3);
		expect(builder.brightnessLevel).toBe(8);
		expect(builder.rgb).toEqual({ r: 0, g: 255, b: 0 });
		expect(builder.sleepTime).toBe(0.5);
		expect(builder.deepSleepTime).toBe(10);
		expect(builder.keyResponse).toBe(8);

		// Buffer defaults (Adapter mode = 15 bytes)
		expect(buffer.length).toBe(15);
		expect(buffer[3]).toBe(0x00); // LightMode.Off
		expect(buffer[4]).toBe(0x03); // (10 min high nibble: 0) | speed: 3
		expect(buffer[5]).toBe(0xa8); // (10 min low nibble: 0x0A << 4) | brightness: 8
		expect(buffer[6]).toBe(0x00); // R
		expect(buffer[7]).toBe(0xff); // G
		expect(buffer[8]).toBe(0x00); // B
		expect(buffer[9]).toBe(0x01); // sleep: 0.5 * 2
		expect(buffer[10]).toBe(0x04); // keyResp: 8 / 2

		// Checksum: 0x00+0x03+0xa8+0x00+0xff+0x00+0x01+0x04 = 0x01AF
		expect(buffer[11]).toBe(0x01);
		expect(buffer[12]).toBe(0xaf);
	});

	it('should correctly set light mode', () => {
		const builder = new LightingSettingsBuilder().setLightMode(LightMode.Neon);
		expect(builder.lightMode).toBe(LightMode.Neon);
		expect(builder.build(ConnectionMode.Wired)[3]).toBe(0x30);
	});

	it('should correctly set brightness level', () => {
		const builder = new LightingSettingsBuilder().setBrightnessLevel(5);
		expect(builder.brightnessLevel).toBe(5);
		// Default deep sleep 10 -> Byte 5 was 0xA8, now should be 0xA5
		expect(builder.build(ConnectionMode.Wired)[5]).toBe(0xa5);
	});

	it('should correctly set LED speed', () => {
		const builder = new LightingSettingsBuilder().setLedSpeed(5);
		expect(builder.ledSpeed).toBe(5);
		// Default deep sleep 10 -> Byte 4 was 0x03, now should be 0x05
		expect(builder.build(ConnectionMode.Wired)[4]).toBe(0x05);
	});

	it('should correctly set RGB color', () => {
		const builder = new LightingSettingsBuilder().setRgb({ r: 255, g: 128, b: 64 });
		expect(builder.rgb).toEqual({ r: 255, g: 128, b: 64 });
		const buffer = builder.build(ConnectionMode.Wired);
		expect(buffer[6]).toBe(255);
		expect(buffer[7]).toBe(128);
		expect(buffer[8]).toBe(64);
	});

	it('should correctly set sleep time', () => {
		const builder = new LightingSettingsBuilder().setSleep(15);
		expect(builder.sleepTime).toBe(15);
		expect(builder.build(ConnectionMode.Wired)[9]).toBe(30);
	});

	it('should correctly set key response time', () => {
		const builder = new LightingSettingsBuilder().setKeyResponse(20);
		expect(builder.keyResponse).toBe(20);
		expect(builder.build(ConnectionMode.Wired)[10]).toBe(10);
	});

	it('should throw error for invalid key response time', () => {
		const builder = new LightingSettingsBuilder();
		// @ts-expect-error test invalid value
		expect(() => builder.setKeyResponse(5)).toThrow(ParamsError);
		// @ts-expect-error test invalid value
		expect(() => builder.setKeyResponse(52)).toThrow(ParamsError);
	});

	describe('Deep Sleep encoding (Fix verification)', () => {
		it('should correctly encode deep sleep < 16 minutes', () => {
			const builder = new LightingSettingsBuilder().setDeepSleep(15);
			// 15 = 0x0F. High=0, Low=0x0F.
			// Byte 4: 0 | 3 = 0x03
			// Byte 5: 0xF0 | 8 = 0xF8
			const buffer = builder.build(ConnectionMode.Wired);
			expect(buffer[4]).toBe(0x03);
			expect(buffer[5]).toBe(0xf8);
		});

		it('should correctly encode deep sleep >= 16 minutes', () => {
			const builder = new LightingSettingsBuilder().setDeepSleep(16);
			// 16 = 0x10. High=0x10, Low=0.
			// Byte 4: 0x10 | 3 = 0x13
			// Byte 5: 0x00 | 8 = 0x08
			const buffer = builder.build(ConnectionMode.Wired);
			expect(buffer[4]).toBe(0x13);
			expect(buffer[5]).toBe(0x08);
		});

		it('should correctly encode deep sleep at max value (60)', () => {
			const builder = new LightingSettingsBuilder().setDeepSleep(60);
			// 60 = 0x3C. High=0x30, Low=0x0C.
			// Byte 4: 0x30 | 3 = 0x33
			// Byte 5: 0xC0 | 8 = 0xC8
			const buffer = builder.build(ConnectionMode.Wired);
			expect(buffer[4]).toBe(0x33);
			expect(buffer[5]).toBe(0xc8);
		});
	});

	describe('Connection Mode and Buffer Size', () => {
		it('should return 13 bytes for Wired mode', () => {
			const builder = new LightingSettingsBuilder();
			const buffer = builder.build(ConnectionMode.Wired);
			expect(buffer.length).toBe(13);
		});

		it('should return 15 bytes for Adapter mode', () => {
			const builder = new LightingSettingsBuilder();
			const buffer = builder.build(ConnectionMode.Adapter);
			expect(buffer.length).toBe(15);
		});
	});

	it('should calculate checksum correctly after multiple changes', () => {
		const builder = new LightingSettingsBuilder()
			.setLightMode(LightMode.Static) // 0x10
			.setLedSpeed(1) // Byte 4 high remains 0 from default 10min, speed=1 -> 0x01
			.setBrightnessLevel(1) // Byte 5 high remains 0x0A from default 10min, bright=1 -> 0xA1
			.setRgb({ r: 255, g: 0, b: 0 }) // 0xFF, 0x00, 0x00
			.setSleep(1) // 1 * 2 = 0x02
			.setKeyResponse(4); // 4 / 2 = 0x02

		// Sum: 0x10 + 0x01 + 0xA1 + 0xFF + 0x00 + 0x00 + 0x02 + 0x02
		// 16 + 1 + 161 + 255 + 0 + 0 + 2 + 2 = 437 = 0x01B5
		const buffer = builder.build(ConnectionMode.Adapter);
		builder.calculateChecksum();
		expect(buffer[11]).toBe(0x01);
		expect(buffer[12]).toBe(0xb5);
	});

	it('should support toString and compareWithHexString', () => {
		const builder = new LightingSettingsBuilder();
		const hex = builder.build(ConnectionMode.Adapter).toString('hex');
		expect(builder.toString()).toBe(hex);
		expect(builder.compareWithHexString(hex)).toBe(true);
		expect(builder.compareWithHexString('invalid')).toBe(false);
	});
});

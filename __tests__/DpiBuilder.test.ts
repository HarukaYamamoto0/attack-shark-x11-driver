import { describe, expect, it } from 'bun:test';
import { ConnectionMode, DpiBuilder, ParamsError } from '../src/index.js';

describe('DpiBuilder', () => {
	it('should initialize with default buffer', () => {
		const builder = new DpiBuilder();
		// Default: Angle Snap Off (0x00), Rippler On (0x01), Stages: 800, 1600, 2400, 3200, 5000, 22000
		expect(builder.toString()).toBe(
			'04380100013f20201225384b75810000000000000001000002ff000000ff000000ffffff0000ffffff00ffff4000ffffff020f6800000000',
		);
	});

	it('should have correct USB control transfer parameters', () => {
		const builder = new DpiBuilder();
		expect(builder.bmRequestType).toBe(0x21);
		expect(builder.bRequest).toBe(0x09);
		expect(builder.wValue).toBe(0x0304);
		expect(builder.wIndex).toBe(2);
	});

	it('should set Angle Snap and Rippler Control', () => {
		const builder = new DpiBuilder();

		builder.setAngleSnap(true);
		expect(builder.buffer[3]).toBe(0x01);

		builder.setAngleSnap(false);
		expect(builder.buffer[3]).toBe(0x00);

		builder.setRipplerControl(true);
		expect(builder.buffer[4]).toBe(0x01);

		builder.setRipplerControl(false);
		expect(builder.buffer[4]).toBe(0x00);
	});

	it('should set current stage', () => {
		const builder = new DpiBuilder();
		builder.setCurrentStage(4);
		expect(builder.buffer[24]).toBe(0x04);
	});

	it('should set DPI values and encode them correctly', () => {
		const builder = new DpiBuilder();

		// 800 DPI -> 0x12
		builder.setDpiValue(1, 800);
		expect(builder.buffer[8]).toBe(0x12);

		// 1600 DPI -> 0x25
		builder.setDpiValue(2, 1600);
		expect(builder.buffer[9]).toBe(0x25);

		// Test throw for unsupported DPI
		expect(() => builder.setDpiValue(1, 99999)).toThrow(ParamsError);
	});

	it('should update stage mask and high stage flags during build', () => {
		const builder = new DpiBuilder();

		// Default stages: 800, 1600, 2400, 3200, 5000, 22,000
		// 22,000 is in range [20,100, 22,000], so the high flag should be 1
		// 22,000 is > 12000, so mask bit 5 (0x20) should be set

		builder.build(ConnectionMode.Wired);

		// Stage 6 (index 5) is 22,000
		expect(builder.buffer[21]).toBe(0x01); // High flag stage 6
		expect(builder.buffer[20]).toBe(0x00); // 5000 is not in ranges

		// 22,000 is > 12,000, so the mask should be 0x20 (bit 5)
		expect(builder.buffer[6]).toBe(0x20);
		expect(builder.buffer[7]).toBe(0x20);

		// Test Range A: 10,100 - 12,000
		builder.setDpiValue(1, 10100);
		builder.build(ConnectionMode.Wired);
		expect(builder.buffer[16]).toBe(0x01); // High flag stage 1 active
		expect(builder.buffer[6]).toBe(0x20); // Mask stage 1 NOT active (10,100 <= 12,000)

		// Test Range B: 20100 - 22000
		builder.setDpiValue(2, 20500);
		builder.build(ConnectionMode.Wired);
		expect(builder.buffer[17]).toBe(0x01); // High flag stage 2 active
		expect(builder.buffer[6]).toBe(0x22); // Mask stage 2 active (20500 > 12000) | stage 6 (0x20) = 0x22

		// Test value between ranges: 15,000
		builder.setDpiValue(3, 15000);
		builder.build(ConnectionMode.Wired);
		expect(builder.buffer[18]).toBe(0x00); // High flag stage 3 NOT active
		expect(builder.buffer[6]).toBe(0x26); // Mask stage 3 active (15,000 > 12,000) | 0x22 = 0x26
	});

	it('should return correct buffer size for Adapter vs Wired mode', () => {
		const builder = new DpiBuilder();

		const wiredBuffer = builder.build(ConnectionMode.Wired);
		expect(wiredBuffer.length).toBe(52); // indices 0 to 51

		const adapterBuffer = builder.build(ConnectionMode.Adapter);
		expect(adapterBuffer.length).toBe(56);
	});
});

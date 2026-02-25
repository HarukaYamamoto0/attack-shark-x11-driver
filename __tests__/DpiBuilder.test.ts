import {describe, expect, it} from "bun:test";
import {ConnectionMode, DpiBuilder} from "../src/index.js";
import {StageIndex} from "../src/protocols/DpiBuilder.js";

describe ("DpiBuilder", () => {
    it("should initialize with default buffer", () => {
        const builder = new DpiBuilder();
        // Default: Angle Snap Off (0x00), Rippler On (0x01), Stages: 800, 1600, 2400, 3200, 5000, 12000
        expect(builder.toString()).toBe("04380100013f20201225384b75810000000000000001000002ff000000ff000000ffffff0000ffffff00ffff4000ffffff020f6800000000");
    });

    it("should have correct USB control transfer parameters", () => {
        const builder = new DpiBuilder();
        expect(builder.bmRequestType).toBe(0x21);
        expect(builder.bRequest).toBe(0x09);
        expect(builder.wValue).toBe(0x0304);
        expect(builder.wIndex).toBe(2);
    });

    it("should set Angle Snap and Rippler Control", () => {
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

    it("should set current stage", () => {
        const builder = new DpiBuilder();
        builder.setCurrentStage(StageIndex.FOURTH);
        expect(builder.buffer[24]).toBe(0x04);
    });

    it("should set DPI values and encode them correctly", () => {
        const builder = new DpiBuilder();

        // 800 DPI -> 0x12
        builder.setDpiValue(StageIndex.FIRST, 800);
        expect(builder.buffer[8]).toBe(0x12);

        // 1600 DPI -> 0x25
        builder.setDpiValue(StageIndex.SECOND, 1600);
        expect(builder.buffer[9]).toBe(0x25);

        // Test throw for unsupported DPI
        expect(() => builder.setDpiValue(StageIndex.FIRST, 99999)).toThrow();
    });

    it("should update stage mask and high stage flags during build", () => {
        const builder = new DpiBuilder();

        // Default stages: 800, 1600, 2400, 3200, 5000, 12000
        // 12000 is > 10000 but NOT > 12000
        // High stage flags (index 16-21) for values > 10000
        // Stage mask (index 6-7) for values > 12000

        builder.build(ConnectionMode.Wired);

        // 12000 (stage 6) is > 10000, so index 21 (16 + 5) should be 1
        expect(builder.buffer[21]).toBe(0x01);
        expect(builder.buffer[20]).toBe(0x00); // 5000 is not > 10000

        // None are > 12000, so mask should be 0
        expect(builder.buffer[6]).toBe(0x00);
        expect(builder.buffer[7]).toBe(0x00);

        // Now set stage 1 to 15000 (> 10000 and > 12000)
        builder.setDpiValue(StageIndex.FIRST, 15000);
        builder.build(ConnectionMode.Wired);

        expect(builder.buffer[16]).toBe(0x01); // High flag stage 1
        expect(builder.buffer[6]).toBe(0x01); // Mask stage 1 bit (0x01)
    });

    it("should calculate correct checksum", () => {
        const builder = new DpiBuilder();
        builder.build(ConnectionMode.Adapter);
        // Sum of buffer from index 3 to 49 AFTER build (which updates masks/flags)
        const checksum = builder.calculateChecksum();

        expect(builder.buffer[50]).toBe((checksum >> 8) & 0xff);
        expect(builder.buffer[51]).toBe(checksum & 0xff);
    });

    it("should return correct buffer size for Adapter vs Wired mode", () => {
        const builder = new DpiBuilder();

        const wiredBuffer = builder.build(ConnectionMode.Wired);
        expect(wiredBuffer.length).toBe(52); // indices 0 to 51

        const adapterBuffer = builder.build(ConnectionMode.Adapter);
        expect(adapterBuffer.length).toBe(56);
    });
})
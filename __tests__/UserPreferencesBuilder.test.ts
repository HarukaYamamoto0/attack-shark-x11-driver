import { describe, expect, it } from "bun:test";
import {ConnectionMode, LightMode, UserPreferencesBuilder} from "../src/index.js";

describe("UserPreferencesBuilder", () => {
    /**
     * Test Case 1: LED Off scenario
     * Matches expected buffer from a panel for Off mode
     */
    it("should match Case 1: LED Off with 5min Deep Sleep", () => {
        const buffer = new UserPreferencesBuilder()
            .setLightMode(LightMode.Off)
            .setDeepSleep(5)
            .setLedSpeed(3)
            .setRgb({r: 0, g: 0, b: 0})
            .setSleep(2)
            .setKeyResponse(4)
            .build(ConnectionMode.Adapter);

        expect(buffer.toString("hex")).toBe("050f01000358000000040200610000");
    });

    /**
     * Test Case 2: Breathing mode with specific RGB
     * Threshold check for index 11 (100, 10, 89 -> only R is >= 100)
     */
    it("should match Case 2: Breathing mode (Threshold test)", () => {
        const buffer = new UserPreferencesBuilder()
            .setLightMode(LightMode.Breathing)
            .setLedSpeed(5) // Fastest -> hardware 1
            .setRgb({r: 100, g: 10, b: 89})
            .setSleep(2)
            .setDeepSleep(10)
            .setKeyResponse(4)
            .build(ConnectionMode.Adapter);

        expect(buffer.toString("hex")).toBe("050f012001a8640a59040201960000");
    });

    /**
     * Test Case 3: Wired mode and Default RGB (Green)
     * Checks subarray behavior and default RGB index 11
     */
    it("should match Case 3: Wired mode with defaults", () => {
        const buffer = new UserPreferencesBuilder()
            .setSleep(2)
            .setDeepSleep(10)
            .setKeyResponse(4)
            .build(ConnectionMode.Wired);

        // defaults: Off mode, Green (0, 255, 0)
        // index 11 should be 1 (count of components >= 100)
        expect(buffer.toString("hex")).toBe("050f010003a800ff00040201b0");
        expect(buffer.length).toBe(13);
    });

    /**
     * Test Case: Neon mode with speed 1
     * Based on docs/light-settings/neon.md
     */
    it("should match Case: Neon mode with speed 1", () => {
        const buffer = new UserPreferencesBuilder()
            .setLightMode(LightMode.Neon)
            .setLedSpeed(1)
            .setDeepSleep(10) // default in many logs seems to be 10
            .setRgb({r: 0, g: 255, b: 0})
            .setSleep(0.5) // default 0.5 min (val 0x01)
            .setKeyResponse(8) // default 8ms (val 0x04)
            .build(ConnectionMode.Wired);

        expect(buffer.toString("hex")).toBe("050f013005a800ff00010401e1");
    });

    /**
     * Test Case: Color Breathing with speed 2
     * Based on docs/light-settings/color-breathing-mode.md
     */
    it("should match Case: Color Breathing with speed 2", () => {
        const buffer = new UserPreferencesBuilder()
            .setLightMode(LightMode.ColorBreathing)
            .setLedSpeed(2)
            .setDeepSleep(10)
            .setRgb({r: 0, g: 255, b: 0})
            .setSleep(0.5)
            .setKeyResponse(8)
            .build(ConnectionMode.Wired);

        expect(buffer.toString("hex")).toBe("050f014004a800ff00010401f0");
    });

    /**
     * Test Case: Static DPI mode
     * Based on docs/light-settings/static-dpi-mode.md (brightness 8, but we use fixed 0x08)
     */
    it("should match Case: Static DPI mode", () => {
        const buffer = new UserPreferencesBuilder()
            .setLightMode(LightMode.StaticDpi)
            .setLedSpeed(3)
            .setDeepSleep(10)
            .setRgb({r: 0, g: 255, b: 0})
            .setSleep(0.5)
            .setKeyResponse(8)
            .build(ConnectionMode.Wired);

        expect(buffer.toString("hex")).toBe("050f015003a800ff00010401ff");
    });

    it("should have correct USB control transfer parameters", () => {
        const builder = new UserPreferencesBuilder();
        expect(builder.bmRequestType).toBe(0x21);
        expect(builder.bRequest).toBe(0x09);
        expect(builder.wValue).toBe(0x0305);
        expect(builder.wIndex).toBe(2);
    });

    it("should initialize with default buffer values", () => {
        const builder = new UserPreferencesBuilder();
        // Index 0, 1, 2 are headers
        expect(builder.buffer[0]).toBe(0x05);
        expect(builder.buffer[1]).toBe(0x0f);
        expect(builder.buffer[2]).toBe(0x01);
        
        // Default mode is Off (0x00) at index 3
        expect(builder.buffer[3]).toBe(LightMode.Off);
        
        // Default RGB is Green (0, 255, 0)
        expect(builder.buffer[6]).toBe(0x00);
        expect(builder.buffer[7]).toBe(0xff);
        expect(builder.buffer[8]).toBe(0x00);
    });

    describe("Boundary and Validation Tests", () => {
        it("should validate all light modes", () => {
            const modes = [
                LightMode.Off, LightMode.Static, LightMode.Breathing,
                LightMode.Neon, LightMode.ColorBreathing, LightMode.StaticDpi,
                LightMode.BreathingDpi
            ];
            const builder = new UserPreferencesBuilder();
            for (const mode of modes) {
                builder.setLightMode(mode);
                expect(builder.buffer[3]!).toBe(mode);
            }
        });

        it("should handle deep sleep boundaries and buckets", () => {
            const builder = new UserPreferencesBuilder();
            
            // Min: 1 min -> Bucket 0, Value 0x18
            builder.setDeepSleep(1);
            expect(builder.buffer[4]! >> 4).toBe(0);
            expect(builder.buffer[5]!).toBe(0x18);

            // 16 min -> Bucket 0
            builder.setDeepSleep(16);
            expect(builder.buffer[4]! >> 4).toBe(0);

            // 17 min -> Bucket 1
            builder.setDeepSleep(17);
            expect(builder.buffer[4]! >> 4).toBe(1);

            // Max: 60 min -> Bucket 3
            builder.setDeepSleep(60);
            expect(builder.buffer[4]! >> 4).toBe(3);
            expect(builder.buffer[5]!).toBe((0x08 + 60 * 16) & 0xFF);

            expect(() => builder.setDeepSleep(0)).toThrow();
            expect(() => builder.setDeepSleep(61)).toThrow();
        });

        it("should handle LED speed boundaries", () => {
            const builder = new UserPreferencesBuilder();
            builder.setLedSpeed(1); // Slowest -> 5
            expect(builder.buffer[4]! & 0x0F).toBe(5);
            builder.setLedSpeed(5); // Fastest -> 1
            expect(builder.buffer[4]! & 0x0F).toBe(1);
            
            expect(() => builder.setLedSpeed(0)).toThrow();
            expect(() => builder.setLedSpeed(6)).toThrow();
        });

        it("should handle sleep timer boundaries", () => {
            const builder = new UserPreferencesBuilder();
            builder.setSleep(0.5);
            expect(builder.buffer[9]!).toBe(1);
            builder.setSleep(30);
            expect(builder.buffer[9]!).toBe(60);

            expect(() => builder.setSleep(0.4)).toThrow();
            expect(() => builder.setSleep(30.5)).toThrow();
        });

        it("should handle key response boundaries and step", () => {
            const builder = new UserPreferencesBuilder();
            builder.setKeyResponse(4);
            expect(builder.buffer[10]!).toBe(2);
            builder.setKeyResponse(50);
            expect(builder.buffer[10]!).toBe(25);

            expect(() => builder.setKeyResponse(2)).toThrow();
            expect(() => builder.setKeyResponse(52)).toThrow();
            expect(() => builder.setKeyResponse(5)).toThrow(); // Odd number
        });
    });

    describe("State Flag (Index 11) Logic", () => {
        it("should count active components (>= 100)", () => {
            const builder = new UserPreferencesBuilder().setLightMode(LightMode.Static);
            
            builder.setRgb({r: 99, g: 99, b: 99});
            expect(builder.buffer[11]!).toBe(0);

            builder.setRgb({r: 100, g: 99, b: 99});
            expect(builder.buffer[11]!).toBe(1);

            builder.setRgb({r: 100, g: 100, b: 99});
            expect(builder.buffer[11]!).toBe(2);

            builder.setRgb({r: 100, g: 100, b: 100});
            expect(builder.buffer[11]!).toBe(3);
        });

        it("should increment count for Breathing DPI mode", () => {
            const builder = new UserPreferencesBuilder().setLightMode(LightMode.BreathingDpi);
            
            builder.setRgb({r: 0, g: 0, b: 0});
            expect(builder.buffer[11]!).toBe(1);

            builder.setRgb({r: 100, g: 100, b: 100});
            expect(builder.buffer[11]!).toBe(4);
        });
    });

    describe("Advanced and Integrity Tests", () => {
        it("should maintain other values when updating a single parameter", () => {
            const builder = new UserPreferencesBuilder()
                .setLightMode(LightMode.Neon)
                .setDeepSleep(30)
                .setLedSpeed(4)
                .setRgb({r: 255, g: 128, b: 64})
                .setSleep(10)
                .setKeyResponse(20);

            const originalBuffer = Buffer.from(builder.buffer);

            // Change only RGB
            builder.setRgb({r: 50, g: 50, b: 50});
            expect(builder.buffer[3]!).toBe(LightMode.Neon); // mode unchanged
            expect(builder.buffer[5]!).toBe(originalBuffer[5]!); // deep sleep unchanged
            expect(builder.buffer[9]!).toBe(originalBuffer[9]!); // sleep unchanged
            expect(builder.buffer[10]!).toBe(originalBuffer[10]!); // debounce unchanged
            
            // Checksum should be different (but only after build/calculate)
            expect(builder.calculateChecksum()).not.toBe(originalBuffer[12]!);
        });

        it("should calculate correct checksum after multiple changes", () => {
            const builder = new UserPreferencesBuilder()
                .setLightMode(LightMode.Static) // 0x10
                .setLedSpeed(5) // Fastest -> hardware 1. index 4: (0<<4)|1 = 0x01
                .setDeepSleep(1) // index 5: 0x08 + 1*16 = 0x18
                .setRgb({r: 255, g: 0, b: 0}) // indices 6,7,8: ff, 00, 00
                .setSleep(1) // index 9: 1 * 2 = 0x02
                .setKeyResponse(4); // index 10: (4-4)/2 + 2 = 0x02

            // Sum: 0x10 + 0x01 + 0x18 + 0xff + 0x00 + 0x00 + 0x02 + 0x02 = 0x12C -> 0x2C
            expect(builder.calculateChecksum()).toBe(0x2C);

            builder.setLedSpeed(1); // Slowest -> hardware 5. index 4 becomes 0x05
            // Sum: 0x10 + 0x05 + 0x18 + 0xff + 0x00 + 0x00 + 0x02 + 0x02 = 0x130 -> 0x30
            expect(builder.calculateChecksum()).toBe(0x30);
        });

        it("should return correct buffer size for Adapter vs Wired mode", () => {
            const builder = new UserPreferencesBuilder();
            
            const adapterBuffer = builder.build(ConnectionMode.Adapter);
            expect(adapterBuffer.length).toBe(15);
            
            const wiredBuffer = builder.build(ConnectionMode.Wired);
            expect(wiredBuffer.length).toBe(13);
            
            // Contents should match up to index 12
            expect(adapterBuffer.subarray(0, 13)).toEqual(wiredBuffer);
        });

        it("should have consistent toString output", () => {
            const builder = new UserPreferencesBuilder()
                .setLightMode(LightMode.Off)
                .setDeepSleep(10)
                .setLedSpeed(3)
                .setRgb({r: 0, g: 255, b: 0})
                .setSleep(0.5)
                .setKeyResponse(8);
            
            builder.build(ConnectionMode.Adapter);
            expect(builder.toString()).toBe("050f010003a800ff00010401af0000");
        });
    });
});

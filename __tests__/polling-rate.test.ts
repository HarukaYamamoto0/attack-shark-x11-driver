import { describe, expect, it } from "bun:test";
import { PollingRateBuilder, PollingRateOptions } from "../src/protocols/PollingRateBuilder.js";

describe("PollingRateBuilder", () => {
    it("should initialize with default buffer", () => {
        const builder = new PollingRateBuilder();
        expect(builder.toString()).toBe("06090101fe00000000");
    });

    it("should set polling rate to 125Hz (powerSaving)", () => {
        const builder = PollingRateBuilder.forRate(PollingRateOptions.powerSaving);
        // value 0x08, complement 0xF7
        expect(builder.toString()).toBe("06090108f700000000");
    });

    it("should set polling rate to 250Hz (office)", () => {
        const builder = PollingRateBuilder.forRate(PollingRateOptions.office);
        // value 0x04, complement 0xFB
        expect(builder.toString()).toBe("06090104fb00000000");
    });

    it("should set polling rate to 500Hz (gaming)", () => {
        const builder = PollingRateBuilder.forRate(PollingRateOptions.gaming);
        // value 0x02, complement 0xFD
        expect(builder.toString()).toBe("06090102fd00000000");
    });

    it("should set polling rate to 1000Hz (eSports)", () => {
        const builder = PollingRateBuilder.forRate(PollingRateOptions.eSports);
        // value 0x01, complement 0xFE
        expect(builder.toString()).toBe("06090101fe00000000");
    });

    it("should have correct USB control transfer parameters", () => {
        const builder = new PollingRateBuilder();
        expect(builder.bmRequestType).toBe(0x21);
        expect(builder.bRequest).toBe(0x09);
        expect(builder.wValue).toBe(0x0306);
        expect(builder.wIndex).toBe(2);
    });

    it("should return the buffer when build() is called", () => {
        const builder = new PollingRateBuilder();
        const buffer = builder.build();
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBe(9);
    });
});

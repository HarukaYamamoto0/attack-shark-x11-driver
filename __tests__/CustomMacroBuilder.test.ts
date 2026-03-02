import {expect, test, describe} from "bun:test";
import {CustomMacroBuilder, MouseMacroEvent} from "../src/protocols/CustomMacroBuilder.js";
import {KeyCode} from "../src/protocols/MacrosBuilder.js";
import {ConnectionMode} from "../src/types.js";

describe("CustomMacroBuilder Delays", () => {
    test("Formula 2*floor((ms+5)/20)+1 should match samples", () => {
        const delays = [
            {ms: 10, expected: 1},
            {ms: 15, expected: 3},
            {ms: 20, expected: 3},
            {ms: 35, expected: 5},
            {ms: 55, expected: 7},
            {ms: 75, expected: 9},
            {ms: 95, expected: 11},
            {ms: 110, expected: 11},
            {ms: 115, expected: 13},
            {ms: 255, expected: 27},
        ];

        for (const {ms, expected} of delays) {
            const customMacro = new CustomMacroBuilder().addEvent(KeyCode.A, ms);
            const [, secondPacket] = customMacro.build(ConnectionMode.Adapter);
            expect(secondPacket![30]).toBe(expected);
        }
    });

    test("Long delays should use extra units and remainder formula", () => {
        // 5000ms: extraUnits = 25 (0x19), rem = 0, byte = 1
        const customMacro = new CustomMacroBuilder().addEvent(KeyCode.A, 5000);
        const [, secondPacket] = customMacro.build(ConnectionMode.Adapter);
        
        // Event 1: [01, 04]
        // Event 2: [19, 03]
        expect(secondPacket![30]).toBe(0x01);
        expect(secondPacket![31]).toBe(KeyCode.A);
        expect(secondPacket![32]).toBe(0x19);
        expect(secondPacket![33]).toBe(0x03);
    });

    test("Mouse events should use the same formula as keyboard", () => {
        const customMacro = new CustomMacroBuilder()
            .addEvent(MouseMacroEvent.LEFT_CLICK, 20)
            .addEvent(MouseMacroEvent.LEFT_CLICK, 20, true);

        const [, secondPacket] = customMacro.build(ConnectionMode.Adapter);

        // 20ms -> 3
        expect(secondPacket![30]).toBe(0x03);
        expect(secondPacket![31]).toBe(MouseMacroEvent.LEFT_CLICK);
        expect(secondPacket![32]).toBe(0x83);
        expect(secondPacket![33]).toBe(MouseMacroEvent.LEFT_CLICK);
    });
});

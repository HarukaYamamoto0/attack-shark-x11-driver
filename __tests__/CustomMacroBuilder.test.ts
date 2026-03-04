import {expect, test, describe} from "bun:test";
import {CustomMacroBuilder, MouseMacroEvent} from "../src/protocols/CustomMacroBuilder.js";
import {KeyCode, MacrosBuilder, FirmwareAction} from "../src/protocols/MacrosBuilder.js";
import {Button, ConnectionMode} from "../src/types.js";

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

describe("CustomMacroBuilder Configuration", () => {
    test("should allow providing custom MacrosBuilder to avoid overwriting other buttons", () => {
        const customMacros = new MacrosBuilder();
        // Change Forward to Middle-Click (index 21)
        customMacros.setMacro(Button.FORWARD, [FirmwareAction.MIDDLE_CLICK, 0x00, 0x00]);

        const builder = new CustomMacroBuilder({
            macrosBuilder: customMacros,
            targetButton: Button.BACKWARD
        });

        const [macroPacket] = builder.build(ConnectionMode.Adapter);

        // The macroPacket should have the Middle Click for Forward button (index 21)
        expect(macroPacket[21]).toBe(FirmwareAction.MIDDLE_CLICK);
    });

    test("should allow providing MacroBuilderOptions to avoid overwriting other buttons", () => {
        const builder = new CustomMacroBuilder({
            macrosBuilder: {
                forward: [FirmwareAction.DISABLE_BUTTON, 0x00, 0x00],
                backward: [FirmwareAction.BACKWARD, 0x00, 0x00]
            },
            targetButton: Button.FORWARD
        });

        const [macroPacket] = builder.build(ConnectionMode.Adapter);

        // The forward button is at index 21
        expect(macroPacket[21]).toBe(FirmwareAction.CUSTOM_MACRO);
        expect(macroPacket[24]).toBe(FirmwareAction.BACKWARD);
    });

    test("should allow setting target button with custom MacrosBuilder via method", () => {
        const customMacros = new MacrosBuilder();
        customMacros.setMacro(Button.FORWARD, [FirmwareAction.DISABLE_BUTTON, 0x00, 0x00]);

        const builder = new CustomMacroBuilder();
        builder.setTargetButton(Button.BACKWARD, customMacros);

        const [macroPacket] = builder.build(ConnectionMode.Adapter);

        // Forward should be disabled (0x01)
        expect(macroPacket[21]).toBe(FirmwareAction.DISABLE_BUTTON);
        // Backward should be Custom Macro (0x12)
        expect(macroPacket[24]).toBe(FirmwareAction.CUSTOM_MACRO);
    });

    test("should allow setting target button with MacroBuilderOptions via method", () => {
        const builder = new CustomMacroBuilder();
        builder.setTargetButton(Button.BACKWARD, {
            forward: [FirmwareAction.DISABLE_BUTTON, 0x00, 0x00]
        });

        const [macroPacket] = builder.build(ConnectionMode.Adapter);

        // Forward should be disabled (0x01)
        expect(macroPacket[21]).toBe(FirmwareAction.DISABLE_BUTTON);
        // Backward should be Custom Macro (0x12)
        expect(macroPacket[24]).toBe(FirmwareAction.CUSTOM_MACRO);
    });

    test("should cap the event counter at 47 even if more events are added", () => {
        const builder = new CustomMacroBuilder();
        // Add 50 events
        for (let i = 0; i < 50; i++) {
            builder.addEvent(KeyCode.A);
        }

        const [, secondPacket] = builder.build(ConnectionMode.Adapter);

        // Capacity is 47, so the counter at index 29 should be 47
        expect(secondPacket[29]).toBe(47);
    });
});

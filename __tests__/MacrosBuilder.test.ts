import { describe, expect, it } from "bun:test";
import {MacrosBuilder, Buttons, macroTemplates, MacroName, FirmwareAction} from "../src/protocols/MacrosBuilder.js";
import { ConnectionMode } from "../src/types.js";

describe("MacrosBuilder", () => {
    it("should initialize with default buffer", () => {
        const builder = new MacrosBuilder();
        // Check header
        expect(builder.buffer[0]).toBe(0x08);
        expect(builder.buffer[1]).toBe(0x3b);
        expect(builder.buffer[2]).toBe(0x01);

        // Check default buttons
        // Left (index 3) -> 0x02
        expect(builder.buffer[3]).toBe(0x02);
        // Right (index 6) -> 0x03
        expect(builder.buffer[6]).toBe(0x03);
        // Middle (index 9) -> 0x04
        expect(builder.buffer[9]).toBe(0x04);
        // Forward (index 21) -> 0x06
        expect(builder.buffer[21]).toBe(0x06);
        // Backward (index 24) -> 0x05
        expect(builder.buffer[24]).toBe(0x05);

        // Check checksum (default)
        builder.build(ConnectionMode.Wired);
        expect(builder.buffer[58]).toBe(0x3e);
    });

    it("should set a macro correctly", () => {
        const builder = new MacrosBuilder();
        const macro = macroTemplates[MacroName.SHORTCUT_COPY]; // [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.C]
        
        builder.setMacro(Buttons.LEFT, macro);
        
        expect(builder.buffer[3]).toBe(0x11); // KEYBOARD
        expect(builder.buffer[4]).toBe(0x01); // CTRL
        expect(builder.buffer[5]).toBe(0x06); // C
    });

    it("should calculate checksum correctly", () => {
        const builder = new MacrosBuilder();
        // Manual calculation for default buffer:
        // Header: 0x08, 0x3b, 0x01
        // sum = 0x01 (starts at index 2)
        // ... (all other bytes)
        // Default sum results in 0x3e as per previous test
        expect(builder.calculateChecksum()).toBe(0x3e);
    });

    it("should support method chaining", () => {
        const builder = new MacrosBuilder();
        const result = builder.setMacro(Buttons.LEFT, macroTemplates[MacroName.GLOBAL_LEFT_CLICK]);
        expect(result).toBe(builder);
    });

    it("should support new descriptive button names", () => {
        const builder = new MacrosBuilder();
        builder.setMacro(Buttons.LEFT, macroTemplates[MacroName.GLOBAL_LEFT_CLICK]);
        builder.setMacro(Buttons.FORWARD, macroTemplates[MacroName.GLOBAL_FORWARD]);
        
        expect(builder.buffer[3]).toBe(0x02); // Left Click
        expect(builder.buffer[21]).toBe(0x06); // Forward
    });

    it("should support remapping DPI button", () => {
        const builder = new MacrosBuilder();
        // Remap DPI button (index 18) to Middle Click
        builder.setMacro(Buttons.DPI, macroTemplates[MacroName.GLOBAL_MIDDLE]);
        
        expect(builder.buffer[18]).toBe(0x04); // MIDDLE_CLICK
        expect(builder.buffer[19]).toBe(0x00);
        expect(builder.buffer[20]).toBe(0x00);
    });

    it("should support remapping scroll wheel", () => {
        const builder = new MacrosBuilder();
        builder.setMacro(Buttons.SCROLL_UP, macroTemplates[MacroName.MULTIMEDIA_VOLUME_PLUS] ?? [FirmwareAction.VOL_PLUS, 0, 0]);
        builder.setMacro(Buttons.SCROLL_DOWN, macroTemplates[MacroName.MULTIMEDIA_VOLUME_MINUS] ?? [FirmwareAction.VOL_MINUS, 0, 0]);
        
        expect(builder.buffer[51]).toBe(0x1b); // VOL_PLUS
        expect(builder.buffer[54]).toBe(0x1c); // VOL_MINUS
    });

    it("should throw error for invalid button identifier", () => {
        const builder = new MacrosBuilder();
        // @ts-ignore
        expect(() => builder.setMacro(99 as any, [0, 0, 0])).toThrow("Invalid button identifier: 99");
    });

    it("should initialize with custom options in constructor", () => {
        const customMacro: any = [0x11, 0x01, 0x04]; // Keyboard, Ctrl, A
        const builder = new MacrosBuilder({
            left: customMacro,
            forward: macroTemplates[MacroName.GLOBAL_FIRE_BUTTON],
            dpi: macroTemplates[MacroName.GLOBAL_DPI_PLUS]
        });

        expect(builder.buffer[3]).toBe(0x11); // Left remapped
        expect(builder.buffer[21]).toBe(0x08); // Forward remapped to FIRE
        expect(builder.buffer[18]).toBe(0x0e); // DPI remapped to DPI+
    });
});

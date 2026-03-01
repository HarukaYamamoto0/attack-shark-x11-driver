import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";
import type {ConnectionMode} from "../types.js";
import {
    Buttons, KeyCode,
    MacroName,
    MacrosBuilder,
    macroTemplates,
    type MacroTuple
} from "./MacrosBuilder.js";

export enum CUSTOM_MACRO_BUTTONS {
    LEFT_BUTTON = 0x01,
    RIGHT_BUTTON = 0x02,
    MIDDLE_BUTTON = 0x03,
    EXTRA_BUTTON_4 = 0x07,
    EXTRA_BUTTON_5 = 0x08,
}

// noinspection JSUnusedGlobalSymbols
export enum MacroSettings {
    THE_NUMBER_OF_TIME_TO_PLAY = 0x00,
    ANY_KEY_PRESS_TO_STOP_PLAYING = 0x01,
    PRESS_AND_HOLD_RELEASE_STOP = 0x02
}

// noinspection JSUnusedGlobalSymbols
export enum MouseMacroEvent {
    LEFT_CLICK = 0xf1,
    RIGHT_CLICK = 0xf2,
    MIDDLE_CLICK = 0xf3,
    FORWARD_CLICK = 0xf5,
    BACKWARD_CLICK = 0xf4,
}

export class CustomMacroBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer = Buffer.alloc(0);
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    private defineMacroButton: MacrosBuilder
    private readonly secondPacket: Buffer = Buffer.alloc(64)
    private readonly thirdPacket: Buffer = Buffer.alloc(64)
    private readonly fourthPacket: Buffer = Buffer.alloc(64)

    private macroEvents: number[] = []

    // noinspection FunctionTooLongJS
    constructor() {
        this.defineMacroButton = new MacrosBuilder()

        this.secondPacket[0] = 0x09 // Header
        this.secondPacket[1] = 0x40 // Header
        this.secondPacket[2] = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_5
        this.secondPacket[3] = 0x00 // Page 0
        this.secondPacket[4] = 0x01
        this.secondPacket[5] = 0x00
        this.secondPacket[6] = 0x00
        this.secondPacket[7] = 0x00
        this.secondPacket[8] = 0x00 // referring to THE_NUMBER_OF_TIME_TO_PLAY, which indicates how many times it will repeat the macro.
        this.secondPacket[9] = 0x00
        this.secondPacket[10] = 0x00
        this.secondPacket[11] = 0x00
        this.secondPacket[12] = 0x00
        this.secondPacket[13] = 0x00
        this.secondPacket[14] = 0x00
        this.secondPacket[15] = 0x00

        this.secondPacket[16] = 0x00
        this.secondPacket[17] = 0x00
        this.secondPacket[18] = 0x00
        this.secondPacket[19] = 0x00
        this.secondPacket[20] = 0x00
        this.secondPacket[21] = 0x00
        this.secondPacket[22] = 0x00
        this.secondPacket[23] = 0x00
        this.secondPacket[24] = 0x00
        this.secondPacket[25] = 0x00
        this.secondPacket[26] = 0x00
        this.secondPacket[27] = 0x00
        this.secondPacket[28] = 0x00
        this.secondPacket[29] = 0x00 // event counter

        // Third Packet

        this.thirdPacket[0] = 0x09 // Header
        this.thirdPacket[1] = 0x40 // Header
        this.thirdPacket[2] = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_5
        this.thirdPacket[3] = 0x01 // Page 1

        // Fourth Packet

        this.fourthPacket[0] = 0x09 // Header
        this.fourthPacket[1] = 0x0C // Header
        this.fourthPacket[2] = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_5
        this.fourthPacket[3] = 0x02 // Page 2
        this.fourthPacket[4] = 0x00
        this.fourthPacket[5] = 0x00
        this.fourthPacket[6] = 0x00
        this.fourthPacket[7] = 0x00
        this.fourthPacket[8] = 0x00
        this.fourthPacket[9] = 0x00
        this.fourthPacket[10] = 0x00 // Big Endian Checksum
        this.fourthPacket[11] = 0x00 // Big Endian Checksum
    }

    private handleDelay(delayMs: number): { eventDelay: number, extraDelay?: number } {
        if (delayMs <= 1070) {
            return {eventDelay: Math.floor(delayMs / 10)};
        } else {
            const extraUnits = Math.floor(delayMs / 200);
            const rem = delayMs % 200;
            return {eventDelay: Math.max(1, Math.floor(rem / 10)), extraDelay: extraUnits};
        }
    }

    addEvent(key: KeyCode | MouseMacroEvent | number, delayMs: number = 10, isRelease: boolean = false) {
        const {eventDelay, extraDelay} = this.handleDelay(delayMs);
        this.pushEventBytes(isRelease ? (0x80 | eventDelay) : eventDelay, key);
        if (extraDelay) {
            this.pushEventBytes(extraDelay, 0x03);
        }
        return this;
    }

    pushEventBytes(byte1: number, byte2: number) {
        this.macroEvents.push(byte1, byte2);
        return this;
    }

    setPlayOptions(mode: MacroSettings, times: number = 1) {
        this.secondPacket[4] = mode === MacroSettings.THE_NUMBER_OF_TIME_TO_PLAY ? times : 0x00;
        this.secondPacket[8] = (mode === MacroSettings.THE_NUMBER_OF_TIME_TO_PLAY && times > 1) ? 0xFF : mode;
        return this;
    }

    setMacroButton(button: Buttons) {
        let buttonMap: CUSTOM_MACRO_BUTTONS
        let macroTemplate: MacroTuple

        switch (button) {
            case Buttons.LEFT_BUTTON:
                buttonMap = CUSTOM_MACRO_BUTTONS.LEFT_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_LEFT_BUTTON]
                break
            case Buttons.RIGHT_BUTTON:
                buttonMap = CUSTOM_MACRO_BUTTONS.RIGHT_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_RIGHT_BUTTON]
                break
            case Buttons.MIDDLE_BUTTON:
                buttonMap = CUSTOM_MACRO_BUTTONS.MIDDLE_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_MIDDLE_BUTTON]
                break
            case Buttons.EXTRA_BUTTON_4:
                buttonMap = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_4
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_EXTRA_BUTTON_4]
                break
            case Buttons.EXTRA_BUTTON_5:
                buttonMap = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_5
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_EXTRA_BUTTON_5]
                break
            default:
                throw new Error("Unsupported button")
        }

        this.defineMacroButton.setMacro(button, macroTemplate)

        this.secondPacket[2] = buttonMap
        this.thirdPacket[2] = buttonMap
        this.fourthPacket[2] = buttonMap

        return this
    }

    calculateChecksum(): number {
        let sum = 0

        for (let i = 8; i < this.secondPacket.length; i++) {
            sum += this.secondPacket[i]!
        }

        for (let i = 4; i < this.thirdPacket.length; i++) {
            sum += this.thirdPacket[i]!
        }
        return sum
    }

    build(mode: ConnectionMode): Buffer[] {
        this.secondPacket[29] = this.macroEvents.length / 2

        // Clear events area first
        this.secondPacket.fill(0, 30);
        this.thirdPacket.fill(0, 4);

        let eventByteIndex = 0;

        // Fill Second Packet (17 events max, 34 bytes)
        for (let i = 30; i < 64 && eventByteIndex < this.macroEvents.length; i++) {
            this.secondPacket[i] = this.macroEvents[eventByteIndex++]!;
        }

        // Fill the Third Packet (30 events max, 60 bytes)
        for (let i = 4; i < 64 && eventByteIndex < this.macroEvents.length; i++) {
            this.thirdPacket[i] = this.macroEvents[eventByteIndex++]!;
        }

        const checksum = this.calculateChecksum()

        this.fourthPacket[10] = (checksum >> 8) & 0xff
        this.fourthPacket[11] = checksum & 0xff

        return [this.defineMacroButton.build(mode), this.secondPacket, this.thirdPacket, this.fourthPacket]
    }

    toString(): string {
        return this.buffer.toString("hex")
    }

    compareWitHexString(value: string): boolean {
        return this.toString() == value
    }
}
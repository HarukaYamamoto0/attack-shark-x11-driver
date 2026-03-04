import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";
import {Button, type ConnectionMode} from "../types.js";
import {
    KeyCode,
    MacroName,
    MacrosBuilder,
    macroTemplates,
    type MacroTuple,
    type MacroBuilderOptions
} from "./MacrosBuilder.js";

export enum CUSTOM_MACRO_BUTTONS {
    LEFT_BUTTON = 0x01,
    RIGHT_BUTTON = 0x02,
    MIDDLE_BUTTON = 0x03,
    EXTRA_BUTTON_4 = 0x07,
    EXTRA_BUTTON_5 = 0x08,
}

// noinspection JSUnusedGlobalSymbols
export enum MacroMode {
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

export interface CustomMacroBuilderOptions {
    playOptions?: {
        mode?: MacroMode,
        times?: number
    }
    targetButton?: Button
    // ⚠️ Use these parameters unless you are certain that this class works; I do not recommend using them directly ⚠️
    macroEvents?: number[]
    macrosBuilder?: MacrosBuilder | MacroBuilderOptions
}

export class CustomMacroBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer = Buffer.alloc(0);
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0309;
    public readonly wIndex: number = 2;

    private defineMacroButton: MacrosBuilder
    private readonly secondPacket: Buffer = Buffer.alloc(64)
    private readonly thirdPacket: Buffer = Buffer.alloc(64)
    private readonly fourthPacket: Buffer = Buffer.alloc(64)

    private readonly macroEvents: number[] = []
    public static readonly MAX_MACRO_EVENTS = 47;

    public static readonly DEFAULT_OPTIONS: CustomMacroBuilderOptions = {
        playOptions: {
            mode: MacroMode.THE_NUMBER_OF_TIME_TO_PLAY,
            times: 1
        },
        macrosBuilder: new MacrosBuilder(),
    };

    // noinspection FunctionTooLongJS
    constructor(options?: CustomMacroBuilderOptions) {
        this.secondPacket[0] = 0x09 // Header
        this.secondPacket[1] = 0x40 // Header
        this.secondPacket[2] = 0x00
        this.secondPacket[3] = 0x00 // Page 0
        this.secondPacket[4] = MacroMode.THE_NUMBER_OF_TIME_TO_PLAY
        this.secondPacket[5] = 0x00
        this.secondPacket[6] = 0x00
        this.secondPacket[7] = 0x00
        this.secondPacket[8] = 0x01 // referring to THE_NUMBER_OF_TIME_TO_PLAY, which indicates how many times it will repeat the macro.
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
        this.thirdPacket[2] = 0x00
        this.thirdPacket[3] = 0x01 // Page 1

        // Fourth Packet

        this.fourthPacket[0] = 0x09 // Header
        this.fourthPacket[1] = 0x0C // Header
        this.fourthPacket[2] = 0x00
        this.fourthPacket[3] = 0x02 // Page 2
        this.fourthPacket[4] = 0x00
        this.fourthPacket[5] = 0x00
        this.fourthPacket[6] = 0x00
        this.fourthPacket[7] = 0x00
        this.fourthPacket[8] = 0x00
        this.fourthPacket[9] = 0x00
        this.fourthPacket[10] = 0x00 // Big Endian Checksum
        this.fourthPacket[11] = 0x00 // Big Endian Checksum

        const config = {...CustomMacroBuilder.DEFAULT_OPTIONS, ...options};

        this.defineMacroButton = CustomMacroBuilder.DEFAULT_OPTIONS.macrosBuilder! as MacrosBuilder
        if (config.macrosBuilder !== undefined) this.defineMacroButton = config.macrosBuilder instanceof MacrosBuilder ? config.macrosBuilder : new MacrosBuilder(config.macrosBuilder)
        if (config.playOptions !== undefined) this.setPlayOptions(config.playOptions.mode, config.playOptions.times)
        if (config.targetButton !== undefined) this.setTargetButton(config.targetButton)
        if (config.macroEvents && config.macroEvents.length > 0) this.macroEvents.push(...config.macroEvents)
    }

    private handleDelay(delayMs: number): { eventDelay: number, extraDelay?: number } {
        const computeByte = (ms: number) => 2 * Math.floor((ms + 5) / 20) + 1;

        if (delayMs <= 1070) {
            return {eventDelay: computeByte(delayMs)};
        } else {
            const extraUnits = Math.floor(delayMs / 200);
            const rem = delayMs % 200;
            return {eventDelay: computeByte(rem), extraDelay: extraUnits};
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

    setPlayOptions(mode: MacroMode = MacroMode.THE_NUMBER_OF_TIME_TO_PLAY, times?: number) {
        this.secondPacket[4] = mode

        if (!times) {
            this.secondPacket[8] = 0x01
            return this;
        }
        if (times < 1 || times > 255) {
            throw new Error("The number of loops must be at least 1 (0x01) and at most 255 (0xFF), regardless of the mode")
        }

        this.secondPacket[8] = times
        return this;
    }

    setTargetButton(button: Button, macrosBuilder?: MacrosBuilder | MacroBuilderOptions) {
        if (macrosBuilder !== undefined) {
            this.defineMacroButton = macrosBuilder instanceof MacrosBuilder ? macrosBuilder : new MacrosBuilder(macrosBuilder)
        }
        let buttonMap: CUSTOM_MACRO_BUTTONS
        let macroTemplate: MacroTuple

        switch (button) {
            case Button.LEFT:
                buttonMap = CUSTOM_MACRO_BUTTONS.LEFT_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_LEFT_BUTTON]
                break
            case Button.RIGHT:
                buttonMap = CUSTOM_MACRO_BUTTONS.RIGHT_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_RIGHT_BUTTON]
                break
            case Button.MIDDLE:
                buttonMap = CUSTOM_MACRO_BUTTONS.MIDDLE_BUTTON
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_MIDDLE_BUTTON]
                break
            case Button.FORWARD:
                buttonMap = CUSTOM_MACRO_BUTTONS.EXTRA_BUTTON_4
                macroTemplate = macroTemplates[MacroName.CUSTOM_MACRO_EXTRA_BUTTON_4]
                break
            case Button.BACKWARD:
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

    build(mode: ConnectionMode): [Buffer, Buffer, Buffer, Buffer] {
        const eventCount = Math.floor(this.macroEvents.length / 2);
        this.secondPacket[29] = Math.min(eventCount, CustomMacroBuilder.MAX_MACRO_EVENTS);

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

    compareWithHexString(value: string): boolean {
        return this.toString() == value
    }
}
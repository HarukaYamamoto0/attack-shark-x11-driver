import {LightMode} from "./protocols/UserPreferencesBuilder.js";
import type {MacroTuple} from "./protocols/MacrosBuilder.js";

export interface ProtocolBuilder {
    readonly buffer: Buffer;
    readonly bmRequestType: number;
    readonly bRequest: number;
    readonly wValue: number;
    readonly wIndex: number;

    calculateChecksum(): number;

    /**
     * Returns the final buffer to be sent to the device
     */
    build(mode: ConnectionMode): Buffer;

    /**
     * Hexadecimal representation of the buffer (for debugging)
     */
    toString(): string
}

export enum ConnectionMode {
    Adapter,
    Wired
}

export interface RGB {
    r: number,
    g: number,
    b: number,
}

export interface UserPreferenceOptions {
    /** Light mode enum */
    lightMode: LightMode

    /** RGB color (0–255 each channel) */
    rgb: RGB

    /** LED speed (1–5) */
    ledSpeed: number

    /** Sleep time in minutes (0.5–30, step 0.5) */
    sleepTime: number

    /** Deep sleep time in minutes (1–60) */
    deepSleepTime: number

    /** Key response in ms (4–50, step 2) */
    keyResponse: number
}

export type LedSpeed = 1 | 2 | 3 | 4 | 5

export type KeyResponse =
    | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18
    | 20 | 22 | 24 | 26 | 28 | 30
    | 32 | 34 | 36 | 38 | 40
    | 42 | 44 | 46 | 48 | 50

export type MacroConfig = Record<
    "left" | "right" | "middle" | "extra4" | "extra5",
    MacroTuple
>
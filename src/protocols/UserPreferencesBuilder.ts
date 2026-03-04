import {ConnectionMode} from "../types.js";
import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";

/**
 * Enum representing different light modes for a device or application.
 *
 * Each mode is associated with a unique hexadecimal value to facilitate
 * identification and control.
 *
 * Enum Members:
 * - `Off`: Represents the state where the light is turned off.
 * - `Static`: Represents a constant, unchanging light mode.
 * - `Breathing`: Represents a light mode that dims and brightens cyclically.
 * - `Neon`: Represents a neon-style light mode with specific effects.
 * - `ColorBreathing`: Represents a breathing light mode with changing colors.
 * - `StaticDpi`: Represents a static light mode associated with DPI settings.
 * - `BreathingDpi`: Represents a breathing light mode associated with DPI settings.
 */
export enum LightMode {
    Off = 0x00,
    Static = 0x10,
    Breathing = 0x20,
    Neon = 0x30,
    ColorBreathing = 0x40,
    StaticDpi = 0x50,
    BreathingDpi = 0x60
}

/**
 * Represents configuration options for building user preferences.
 */
export interface UserPreferencesBuilderOptions {
    /** Light mode enum */
    lightMode?: LightMode

    /** RGB color (0–255 each channel) */
    rgb?: RGB

    /** LED speed (1–5) */
    ledSpeed?: LedSpeed

    /** Sleep time in minutes (0.5–30, step 0.5) */
    sleepTime?: SleepTime

    /** Deep sleep time in minutes (1–60) */
    deepSleepTime?: DeepSleepTime

    /** Key response in ms (4–50, step 2) */
    keyResponse?: KeyResponse
}

/**
 * Represents a color in the RGB color model.
 *
 * The RGB model describes colors through their red, green, and blue components.
 * Each component is represented as a numerical value.
 *
 * The `r` property corresponds to the red component,
 * the `g` property corresponds to the green component,
 * and the `b` property corresponds to the blue component.
 */
export interface RGB {
    r: number,
    g: number,
    b: number,
}

/**
 * Defines the allowed speed levels for an LED.
 *
 * This type represents the range of possible speed values for an LED,
 * which can be set to one of the following levels:
 * 1 - Lowest speed
 * 2 - Low speed
 * 3 - Medium speed
 * 4 - High speed
 * 5 - Highest speed
 *
 * It is commonly used to control animations or blinking intervals for LED components.
 */
export type LedSpeed = 1 | 2 | 3 | 4 | 5

/**
 * Represents a KeyResponse, which is a union type of allowed numeric values.
 *
 * The KeyResponse type is strictly defined as one of the following values:
 * 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
 * 32, 34, 36, 38, 40, 42, 44, 46, 48, 50.
 *
 * This type is typically used to define a finite set of acceptable numeric values
 * for specific use cases or configurations.
 */
export type KeyResponse =
    | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18
    | 20 | 22 | 24 | 26 | 28 | 30
    | 32 | 34 | 36 | 38 | 40
    | 42 | 44 | 46 | 48 | 50

/**
 * Represents a type definition for deep sleep time, constrained to specific integer values.
 *
 * The `DeepSleepTime` type is intended to define a range of valid values
 * representing time in minutes, from 1 to 60 inclusive.
 *
 * This type can be used for scenarios where precise and limited values are
 * required to specify the duration of deep sleep in minutes.
 */
export type DeepSleepTime =
    | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
    | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19
    | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29
    | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39
    | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49
    | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60;

/**
 * Represents a type that defines allowed sleep durations in increments of 0.5 minutes.
 *
 * Each value corresponds to a specific number of minutes that can be selected
 * for representing sleep time, ranging from 0.5 minutes to 30 minutes.
 */
export type SleepTime =
    | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5
    | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10
    | 10.5 | 11 | 11.5 | 12 | 12.5 | 13 | 13.5 | 14 | 14.5 | 15
    | 15.5 | 16 | 16.5 | 17 | 17.5 | 18 | 18.5 | 19 | 19.5 | 20
    | 20.5 | 21 | 21.5 | 22 | 22.5 | 23 | 23.5 | 24 | 24.5 | 25
    | 25.5 | 26 | 26.5 | 27 | 27.5 | 28 | 28.5 | 29 | 29.5 | 30;

/**
 * Builder for user preferences and configurations (Report 0x0305)
 * Handles Light Mode, Deep Sleep, Sleep, Key Response and RGB settings.
 */
export class UserPreferencesBuilder implements BaseProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0305;
    public readonly wIndex: number = 2;

    private deepSleepMinutes: number = 10;
    private ledSpeed: number = 0x03;

    public static readonly DEFAULT_OPTIONS: UserPreferencesBuilderOptions = {
        lightMode: LightMode.Off,
        rgb: {r: 0, g: 255, b: 0},
        ledSpeed: 3,
        sleepTime: 0.5,
        deepSleepTime: 10,
        keyResponse: 4
    };

    constructor(options?: UserPreferencesBuilderOptions) {
        this.buffer = Buffer.alloc(15);
        this.buffer[0] = 0x05; // header
        this.buffer[1] = 0x0f; // header
        this.buffer[2] = 0x01; // header
        this.buffer[3] = 0x00; // Default color mode (Off)
        this.buffer[4] = 0x03; // Default bucket (0) << 4 | default ledSpeed (3)
        this.buffer[5] = 0xa8; // Default deep sleep (10 min)
        this.buffer[6] = 0x00; // RGB: R
        this.buffer[7] = 0xff; // RGB: G
        this.buffer[8] = 0x00; // RGB: B
        this.buffer[9] = 0x01; // Default sleep (0.5 min)
        this.buffer[10] = 0x04; // Default key response (8ms)
        this.buffer[11] = 0x01;
        this.buffer[12] = 0xAF; // Initial checksum

        const config = {...UserPreferencesBuilder.DEFAULT_OPTIONS, ...options};

        if (config.lightMode !== undefined) this.setLightMode(config.lightMode)
        if (config.deepSleepTime !== undefined) this.setDeepSleep(config.deepSleepTime)
        if (config.ledSpeed !== undefined) this.setLedSpeed(config.ledSpeed)
        if (config.rgb !== undefined) this.setRgb(config.rgb)
        if (config.keyResponse !== undefined) this.setKeyResponse(config.keyResponse)
        if (config.sleepTime !== undefined) this.setSleep(config.sleepTime)
    }

    /**
     * Sets the light mode for the current object and updates the internal state accordingly.
     *
     * @param {LightMode} mode - The desired light mode to be set.
     * @return {this} The instance of the current object for method chaining.
     */
    setLightMode(mode: LightMode): this {
        this.buffer[3] = mode;
        this.updateIndex11();
        return this;
    }

    /**
     * Sets the deep sleep timer
     * @param minutes Time in minutes (1-60)
     */
    setDeepSleep(minutes: DeepSleepTime): this {
        if (minutes < 1 || minutes > 60) {
            throw new Error("the minutes of deep sleep should be in the range of 1 to 60");
        }
        this.deepSleepMinutes = minutes;
        this.updateIndex4();
        this.buffer[5] = (0x08 + minutes * 0x10) & 0xFF;
        return this;
    }

    /**
     * Sets the LED animation speed
     * @param speed Speed level (1-5, where 5 is fastest and 1 is slowest)
     */
    setLedSpeed(speed: LedSpeed): this {
        if (speed < 1 || speed > 5) {
            throw new Error("LED speed must be between 1 and 5");
        }
        this.ledSpeed = speed;
        this.updateIndex4();
        return this;
    }

    private updateIndex4(): void {
        const bucket = Math.floor((this.deepSleepMinutes - 1) / 16);
        // Scale is inverted in hardware: User 1-5 -> Hardware 5-1
        const hardwareSpeed = 6 - this.ledSpeed;
        // high nibble = deep sleep bucket, low nibble = led speed
        this.buffer[4] = ((bucket << 4) | (hardwareSpeed & 0x0F)) & 0xFF;
    }

    /**
     * Sets the RGB color values for the current buffer.
     *
     * @param {RGB} rgb - An object containing the red (r), green (g), and blue (b) color values to be set, where each value is an integer in the range 0-255.
     * @return {this} The current instance, allowing for method chaining.
     */
    setRgb(rgb: RGB): this {
        this.buffer[6] = rgb.r & 0xFF;
        this.buffer[7] = rgb.g & 0xFF;
        this.buffer[8] = rgb.b & 0xFF;
        this.updateIndex11();
        return this;
    }

    private updateIndex11(): void {
        const mode = this.buffer[3]!;
        const r = this.buffer[6]!;
        const g = this.buffer[7]!;
        const b = this.buffer[8]!;

        let count = 0;
        if (r >= 0x64) count++;
        if (g >= 0x64) count++;
        if (b >= 0x64) count++;

        if (mode === LightMode.BreathingDpi) {
            this.buffer[11] = (count + 1) & 0xFF;
        } else {
            this.buffer[11] = count & 0xFF;
        }
    }

    /**
     * Sets the sleep timer (normal sleep)
     * @param minutes Time in minutes (0.5 to 30, step example: 0.5, 1, 1.5, 2.5, etc.)
     */
    setSleep(minutes: SleepTime): this {
        if (minutes < 0.5 || minutes > 30) {
            throw new Error("Invalid sleep value (0.5–30 min)");
        }
        this.buffer[9] = Math.round(minutes * 2);
        return this;
    }

    /**
     * Sets the key response time (debounce)
     * @param ms Time in milliseconds (4-50ms, must be even)
     */
    setKeyResponse(ms: KeyResponse): this {
        if (ms < 4 || ms > 50 || ms % 2 !== 0) {
            throw new Error("Invalid value (use 4–50ms, step 2)");
        }

        this.buffer[10] = ((ms - 4) / 2) + 0x02;
        return this;
    }

    calculateChecksum(): number {
        let checksum = 0;
        // Checksum is the sum of bytes from index 3 to 10
        for (let i = 3; i <= 10; i++) {
            checksum = (checksum + this.buffer[i]!) & 0xff;
        }
        return checksum;
    }

    build(mode: ConnectionMode): Buffer {
        this.buffer[12] = this.calculateChecksum();
        if (mode == ConnectionMode.Wired) return this.buffer.subarray(0, 13);
        else return this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }

    compareWithHexString(value: string): boolean {
        return this.toString() == value
    }
}

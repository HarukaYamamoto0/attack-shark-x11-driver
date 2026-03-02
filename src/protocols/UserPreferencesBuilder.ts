import {ConnectionMode, type RGB, type UserPreferenceOptions} from "../types.js";
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
    static DEFAULT_PREFS: UserPreferenceOptions = {
        lightMode: LightMode.Off,
        rgb: {r: 0, g: 255, b: 0},
        ledSpeed: 5,
        sleepTime: 0.5,
        deepSleepTime: 10,
        keyResponse: 8
    };

    constructor() {
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
    setDeepSleep(minutes: number): this {
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
    setLedSpeed(speed: number): this {
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
    setSleep(minutes: number): this {
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
    setKeyResponse(ms: number): this {
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

    compareWitHexString(value: string): boolean {
        return this.toString() == value
    }
}

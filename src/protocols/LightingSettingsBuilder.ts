import { Buffer } from 'node:buffer';
import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { ConnectionMode, type ProfileId } from '../types.js';

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
	Off = 0x0,
	Static = 0x1,
	Breathing = 0x2,
	Neon = 0x3,
	ColorBreathing = 0x4,
	StaticDpi = 0x5,
	BreathingDpi = 0x6,
}

/**
 * Represents configuration options for building user preferences.
 */
export interface LightingSettingsBuilderOptions {
	profileId?: ProfileId;
	/** Light mode enum */
	lightMode?: LightMode;

	/** RGB color (0–255 each channel) */
	rgb?: RGB;

	/** LED speed (1–5) */
	ledSpeed?: LedSpeed;

	/** Sleep time in minutes (0.5–30, step 0.5) */
	sleepTime?: SleepTime;

	/** Deep sleep time in minutes (1–60) */
	deepSleepTime?: DeepSleepTime;

	/** Key response in ms (4–50, step 2) */
	keyResponse?: KeyResponse;
	brightnessLevel?: BrightnessLevel;
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
	r: number;
	g: number;
	b: number;
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
export type LedSpeed = 1 | 2 | 3 | 4 | 5;

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
// prettier-ignore
export type KeyResponse = 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 | 34 | 36 | 38 | 40 | 42
	| 44 | 46 | 48 | 50;

/**
 * Represents a type definition for deep sleep time, constrained to specific integer values.
 *
 * The `DeepSleepTime` type is intended to define a range of valid values
 * representing time in minutes, from 1 to 60 inclusive.
 *
 * This type can be used for scenarios where precise and limited values are
 * required to specify the duration of deep sleep in minutes.
 */
// prettier-ignore
export type DeepSleepTime = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21
	| 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45
	| 46 | 47 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60;

/**
 * Represents a type that defines allowed sleep durations in increments of 0.5 minutes.
 *
 * Each value corresponds to a specific number of minutes that can be selected
 * for representing sleep time, ranging from 0.5 minutes to 30 minutes.
 */
// prettier-ignore
export type SleepTime = 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10
	| 10.5 | 11 | 11.5 | 12 | 12.5 | 13 | 13.5 | 14 | 14.5 | 15 | 15.5 | 16 | 16.5 | 17 | 17.5 | 18 | 18.5 | 19 | 19.5
	| 20 | 20.5 | 21 | 21.5 | 22 | 22.5 | 23 | 23.5 | 24 | 24.5 | 25 | 25.5 | 26 | 26.5 | 27 | 27.5 | 28 | 28.5 | 29 | 29.5
	| 30;

export type BrightnessLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface LightingSettingsOptions {
	profileId: ProfileId;
	lightMode: LightMode;
	rgb: RGB;
	ledSpeed: LedSpeed;
	sleepTime: SleepTime;
	deepSleepTime: DeepSleepTime;
	keyResponse: KeyResponse;
	brightnessLevel?: BrightnessLevel;
}

export const lightingSettingsDefaultOptions: LightingSettingsOptions = {
	profileId: 1,
	lightMode: LightMode.Off,
	rgb: { r: 0, g: 255, b: 0 },
	ledSpeed: 3,
	sleepTime: 0.5,
	deepSleepTime: 10,
	keyResponse: 8,
	brightnessLevel: 8,
};

// prettier-ignore
export const sleepTimeLut: SleepTime[] = [
	0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5,
	14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25,
	25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30,
]

/**
 * Builder for user preferences and configurations (Report 0x0305)
 * Handles Light Mode, Deep Sleep, Sleep, Key Response and RGB settings.
 */
export class LightingSettingsBuilder implements BaseProtocolBuilder {
	public buffer: Buffer = Buffer.alloc(15);
	private view = new DataView(this.buffer.buffer);
	public readonly bmRequestType: number = 0x21;
	public readonly bRequest: number = 0x09;
	public readonly wValue: number = 0x0305;
	public readonly wIndex: number = 2;

	public profileId = lightingSettingsDefaultOptions.profileId;
	public ledSpeed = lightingSettingsDefaultOptions.ledSpeed;
	public lightMode = lightingSettingsDefaultOptions.lightMode;
	public deepSleepTime = lightingSettingsDefaultOptions.deepSleepTime;
	public sleepTime = lightingSettingsDefaultOptions.sleepTime;
	public brightnessLevel = lightingSettingsDefaultOptions.brightnessLevel;
	public rgb = lightingSettingsDefaultOptions.rgb;
	public keyResponse = lightingSettingsDefaultOptions.keyResponse;

	constructor(options?: LightingSettingsBuilderOptions) {
		this.view.setInt8(0, 0x05); // Report ID
		this.view.setInt8(1, 0x0f); // length
		this.view.setInt8(2, 0x01); // profile ID
		this.view.setInt8(3, 0x00); // lightMode (off) | 0x00
		this.view.setInt8(4, 0x03); // Deep Sleep H | LedSpeed
		this.view.setInt8(5, 0xa8); // Deep Sleep L | Brightness
		this.view.setInt8(6, 0x00); // RGB: R
		this.view.setInt8(7, 0xff); // RGB: G
		this.view.setInt8(8, 0x00); // RGB: B
		this.view.setInt8(9, 0x01); // sleep time
		this.view.setInt8(10, 0x04); // key response
		this.view.setInt8(11, 0x01); // checksum H
		this.view.setInt8(12, 0xaf); // checksum L
		this.view.setInt8(13, 0x00); // padding
		this.view.setInt8(14, 0x00); // padding

		const config = { ...lightingSettingsDefaultOptions, ...options };

		if (config.profileId !== undefined) this.setProfileId(config.profileId);
		if (config.lightMode !== undefined) this.setLightMode(config.lightMode);
		if (config.deepSleepTime !== undefined) this.setDeepSleep(config.deepSleepTime);
		if (config.ledSpeed !== undefined) this.setLedSpeed(config.ledSpeed);
		if (config.rgb !== undefined) this.setRgb(config.rgb);
		if (config.keyResponse !== undefined) this.setKeyResponse(config.keyResponse);
		if (config.sleepTime !== undefined) this.setSleep(config.sleepTime);
		if (config.brightnessLevel !== undefined) this.setBrightnessLevel(config.brightnessLevel);
	}

	setProfileId(id: ProfileId): this {
		this.profileId = id;
		this.view.setInt8(2, id);
		return this;
	}

	/**
	 * Sets the light mode for the current object and updates the internal state accordingly.
	 *
	 * @param {LightMode} mode - The desired light mode to be set.
	 * @return {this} The instance of the current object for method chaining.
	 */
	setLightMode(mode: LightMode): this {
		this.lightMode = mode;

		this.view.setInt8(3, mode << 4);
		return this;
	}

	getLightMode(): LightMode {
		const lightMode = this.view.getUint8(3);
		return lightMode >> 4;
	}

	setBrightnessLevel(brightnessLevel: BrightnessLevel): this {
		this.brightnessLevel = brightnessLevel;

		const deepSleepLTimeAndBrightnessLevelByte = this.view.getUint8(5);
		const deepSleepTimeLByte = deepSleepLTimeAndBrightnessLevelByte & 0xf0;

		this.view.setInt8(5, deepSleepTimeLByte | brightnessLevel);
		return this;
	}

	getBrightnessLevel(): BrightnessLevel {
		const deepSleepLTimeAndBrightnessLevelByte = this.view.getUint8(5);
		const brightnessLevel = deepSleepLTimeAndBrightnessLevelByte & 0x0f;
		return brightnessLevel as BrightnessLevel;
	}

	/**
	 * Sets the deep sleep timer
	 * @param minutes Time in minutes (1-60)
	 */
	setDeepSleep(minutes: DeepSleepTime): this {
		this.deepSleepTime = minutes;

		const deepSleepHTimeAndLedSpeedByte = this.view.getUint8(4);
		const deepSleepLTimeAndBrightnessLevelByte = this.view.getUint8(5);

		const ledSpeedByte = deepSleepHTimeAndLedSpeedByte & 0x0f;
		const brightnessLevel = deepSleepLTimeAndBrightnessLevelByte & 0x0f;

		const iSleepH = minutes & 0xf0;
		const iSleepL = minutes & 0x0f;

		this.view.setInt8(4, iSleepH | ledSpeedByte);
		this.view.setInt8(5, (iSleepL << 4) | brightnessLevel);

		return this;
	}

	/**
	 * Sets the LED animation speed
	 * @param speed Speed level (1-5, where 5 is fastest and 1 is slowest)
	 */
	setLedSpeed(speed: LedSpeed): this {
		this.ledSpeed = speed;

		const deepSleepHTimeAndLedSpeedByte = this.view.getUint8(4);
		const deepSleepHByte = deepSleepHTimeAndLedSpeedByte & 0xf0;

		this.view.setInt8(4, deepSleepHByte | speed);

		return this;
	}

	/**
	 * Sets the RGB color values for the current buffer.
	 *
	 * @param {RGB} rgb - An object containing the red (r), green (g), and blue (b) color values to be set, where each value is an integer in the range 0-255.
	 * @return {this} The current instance, allowing for method chaining.
	 */
	setRgb(rgb: RGB): this {
		this.rgb = rgb;

		this.view.setInt8(6, rgb.r & 0xff);
		this.view.setInt8(7, rgb.g & 0xff);
		this.view.setInt8(8, rgb.b & 0xff);

		return this;
	}

	/**
	 * Sets the sleep timer (normal sleep)
	 * @param time Time in minutes (0.5 to 30, step example: 0.5, 1, 1.5, 2.5, etc.)
	 */
	setSleep(time: SleepTime): this {
		this.sleepTime = time;

		this.view.setInt8(9, Math.round(time * 2) & 0xff);

		return this;
	}

	getSleep(): SleepTime {
		const sleepTime = this.view.getUint8(9);
		return sleepTimeLut[sleepTime - 1] ?? this.sleepTime;
	}

	/**
	 * Sets the key response time (debounce)
	 * @param ms Time in milliseconds (4-50ms, must be even)
	 */
	setKeyResponse(ms: KeyResponse): this {
		this.keyResponse = ms;

		if (ms < 4 || ms > 50 || ms % 2 !== 0) {
			throw new ParamsError('keyResponse', 'Invalid value (use 4–50ms, step 2)');
		}

		this.view.setInt8(10, ms / 2);

		return this;
	}

	calculateChecksum(): this {
		let checksum = 0;

		for (let i = 3; i <= 10; i++) {
			checksum = checksum + this.view.getUint8(i);
		}

		this.view.setInt16(11, checksum);
		return this;
	}

	build(mode: ConnectionMode): Buffer {
		if (mode === ConnectionMode.Wired) return this.buffer.subarray(0, 13);
		else return this.buffer;
	}

	toString(): string {
		return this.buffer.toHex();
	}

	compareWithHexString(value: string): boolean {
		return this.buffer.toHex() === value;
	}
}

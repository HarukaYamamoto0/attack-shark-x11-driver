import {
	type BrightnessLevel,
	type DeepSleepTime,
	type KeyResponse,
	type LedSpeed,
	LightingSettingsBuilder,
	lightingSettingsDefaultOptions,
	type LightMode,
	type RGB,
	sleepTimeLut,
} from '../protocols/LightingSettingsBuilder';
import { type Option, PacketLength } from '../types';

export function handleResponseLightingSettings(buffer: Uint8Array): Option<LightingSettingsBuilder> {
	console.log('Raw: ' + buffer.toHex());
	if (buffer.length !== 15)
		throw new Error(
			`Invalid lighting settings buffer size; expected ${PacketLength.LIGHTING_SETTINGS} but received ${buffer.length}`,
		);

	const view = new DataView(buffer.buffer);
	// const reportId = view.getUint8(0); // not used
	// const packetLength = view.getUint8(1); // not used
	const profileId = view.getUint8(2);

	const lightModeByte = view.getUint8(3);
	const deepSleepHTimeAndLedSpeedByte = view.getUint8(4);
	const deepSleepLTimeAndBrightnessLevelByte = view.getUint8(5);
	const redByte = view.getUint8(6);
	const greenByte = view.getUint8(7);
	const blueByte = view.getUint8(8);
	const sleepTimeByte = view.getUint8(9);
	const keyResponseByte = view.getUint8(10);

	const checksumByte = view.getUint16(11);

	const lightMode = lightModeByte as LightMode;

	const iSleepH = (deepSleepHTimeAndLedSpeedByte & 0xf0) >> 4;
	const ledSpeed = (deepSleepHTimeAndLedSpeedByte & 0x0f) as LedSpeed;

	const iSleepL = (deepSleepLTimeAndBrightnessLevelByte & 0xf0) >> 4;
	const brightnessLevel = (deepSleepLTimeAndBrightnessLevelByte & 0x0f) as BrightnessLevel;

	const red = redByte;
	const green = greenByte;
	const blue = blueByte;

	let checksum = 0x00;
	for (let i = 3; i <= 10; i++) {
		checksum += view.getUint8(i);
	}

	if (checksum !== checksumByte)
		throw new Error(
			`Invalid lighting settings response checksum; expected: ${checksumByte.toString(16).padStart(4, '0')}, but calculated: ${checksum.toString(16).padStart(4, '0')}`,
		);

	return new LightingSettingsBuilder({
		profileId: profileId,
		lightMode: lightMode,
		ledSpeed: ledSpeed,
		deepSleepTime: ((iSleepH << 4) | iSleepL) as DeepSleepTime,
		brightnessLevel: brightnessLevel,
		rgb: {
			r: red,
			g: green,
			b: blue,
		} as RGB,
		sleepTime: sleepTimeLut[sleepTimeByte - 1] ?? lightingSettingsDefaultOptions.sleepTime,
		keyResponse: (keyResponseByte * 2) as KeyResponse,
	}).calculateChecksum();
}

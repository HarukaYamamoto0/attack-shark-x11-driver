import type { RGB } from '../types.ts';

export function handleLightingSettingsResponse(data: Uint8Array): LightSettingsBuilder {
	console.log(data.toHex());

	if (data.length !== 15) throw new Error('Invalid lighting settings response length');

	// 05 0f 01 00 03 a8 00 ff 00 01 04 01 af 00 00

	const view = new DataView(data.buffer);
	// const reportId = view.getUint8(0); // not used
	// const packetLength = view.getUint8(1); // not used
	const profileIdByte = view.getUint8(2);

	const lightModeByte = view.getUint8(3);
	const deepSleepHTimeAndLedSpeedByte = view.getUint8(4);
	const deepSleepLTimeAndBrightnessLevelByte = view.getUint8(5);
	const redByte = view.getUint8(6);
	const greenByte = view.getUint8(7);
	const blueByte = view.getUint8(8);
	const sleepTimeByte = view.getUint8(9);
	const keyResponseByte = view.getUint8(10);

	const checksumByte = view.getUint16(11);

	const profileId = (profileIdByte >> 4) as ProfileId;
	const lightMode = (lightModeByte << 4) as LightMode;

	const iSleepH = deepSleepHTimeAndLedSpeedByte & 0xf0;
	const ledSpeed = (deepSleepHTimeAndLedSpeedByte & 0x0f) as LedSpeed;

	const iSleepL = deepSleepLTimeAndBrightnessLevelByte & 0xf0;
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
			`Invalid lighting settings response checksum: ${checksum.toString(16)}, expected: ${checksumByte.toString(16)}`,
		);

	return new LightSettingsBuilder({
		profileId: profileId,
		lightMode: lightMode,
		ledSpeed: ledSpeed,
		deepSleepTime: (iSleepH | iSleepL) as DeepSleepTime,
		brightness: brightnessLevel,
		rgb: {
			r: red,
			g: green,
			b: blue,
		} as RGB,
		sleepTime: sleepTimeByte as SleepTime,
		keyResponse: keyResponseByte as KeyResponse,
	});
}

interface LightSettingsOptions {
	profileId: ProfileId;
	lightMode: LightMode;
	ledSpeed: LedSpeed;
	deepSleepTime: DeepSleepTime;
	brightness: BrightnessLevel;
	rgb: RGB;
	sleepTime: SleepTime;
	keyResponse: KeyResponse;
}

const lightModeLut = [0x00, 0x10, 0x20, 0x30, 0x40, 0x50, 0x60];
const sleepTimeLut = [
	0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5,
	14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25,
	25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30,
];
const keyResponseLut = [
	4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 | 50,
];

export class LightSettingsBuilder implements LightSettingsOptions {
	public profileId: ProfileId = 1;
	public lightMode: LightMode = LightMode.Off;
	public ledSpeed: LedSpeed = 3;
	public deepSleepTime: DeepSleepTime = 10;
	public brightness: BrightnessLevel = 8;
	public rgb: RGB = {
		r: 0x00,
		g: 0xff,
		b: 0x00,
	};
	public sleepTime: SleepTime = 0.5;
	public keyResponse: KeyResponse = 8;
	public unknownByte: number = 0x01;

	private readonly buffer: Uint8Array<ArrayBuffer> = new Uint8Array(15);
	private view: DataView = new DataView(this.buffer.buffer);

	constructor(options: LightSettingsOptions) {
		this.setProfileId(options.profileId);
		this.setLightMode(options.lightMode);
		this.setLedSpeed(options.ledSpeed);
		this.setDeepSleepTime(options.deepSleepTime);
		this.setBrightness(options.brightness);
		this.setRGB(options.rgb);
		this.setSleepTime(options.sleepTime);
		this.setKeyResponse(options.keyResponse);

		this.buffer[0] = 0x05; // report id
		this.buffer[1] = 0x0f; // package length
		this.buffer[2] = 0x01; // profile id
		this.buffer[3] = 0x00; // Default color mode (Off) | 0x0
		this.buffer[4] = 0x03; // deep sleepH | ledSpeed
		this.buffer[5] = 0xa8; // deep sleepL | brightness
		this.buffer[6] = 0x00; // RGB: R
		this.buffer[7] = 0xff; // RGB: G
		this.buffer[8] = 0x00; // RGB: B
		this.buffer[9] = 0x01; // sleep time
		this.buffer[10] = 0x04; // key response (8ms)
		this.buffer[11] = 0x01; // checksum high
		this.buffer[12] = 0xaf; // checksum low
		this.buffer[13] = 0x00; // padding
		this.buffer[14] = 0x00; // padding
	}

	setProfileId(profileId: ProfileId): this {
		this.profileId = profileId;
		this.view.setInt8(2, profileId);
		return this;
	}

	setLightMode(lightMode: LightMode): this {
		if (lightModeLut.indexOf(lightMode) === -1) throw new Error('Invalid light mode');

		this.lightMode = lightMode;
		this.view.setInt8(3, lightMode << 4);
		return this;
	}

	setLedSpeed(ledSpeed: LedSpeed): this {
		if (ledSpeed < 1 || ledSpeed > 5) throw new Error('Led speed must be between 1 and 5');

		this.ledSpeed = ledSpeed;
		this.view.setInt8(4, (this.deepSleepTime << 4) | ledSpeed);
		this.view.setInt8(5, (this.deepSleepTime >> 4) | this.brightness);
		return this;
	}

	setDeepSleepTime(deepSleepTime: DeepSleepTime): this {
		console.log("aaaa", deepSleepTime); 0xa0;
		if (deepSleepTime < 0 || deepSleepTime > 60) throw new Error('Deep sleep time must be between 1 and 60');

		this.deepSleepTime = deepSleepTime;
		this.view.setInt8(4, (deepSleepTime << 4) | this.ledSpeed);
		this.view.setInt8(5, (deepSleepTime >> 4) | this.brightness);
		return this;
	}

	setBrightness(brightness: BrightnessLevel): this {
		if (brightness < 1 || brightness > 8) throw new Error('Brightness must be between 1 and 8');

		this.brightness = brightness;
		this.view.setInt8(4, (this.deepSleepTime << 4) | this.ledSpeed);
		this.view.setInt8(5, (this.deepSleepTime >> 4) | brightness);
		return this;
	}

	setRGB(rgb: RGB): this {
		this.rgb = rgb;
		this.view.setInt8(6, rgb.r);
		this.view.setInt8(7, rgb.g);
		this.view.setInt8(8, rgb.b);
		return this;
	}

	setSleepTime(sleepTime: SleepTime): this {
		if (sleepTime < 0.5 || sleepTime > 30) throw new Error('Sleep time must be between 0.5 and 30');
		if (sleepTimeLut.indexOf(sleepTime) === -1) throw new Error('Invalid sleep time');

		this.sleepTime = sleepTime;
		this.view.setInt8(9, sleepTime);
		return this;
	}

	setKeyResponse(keyResponse: KeyResponse): this {
		if (keyResponse < 4 || keyResponse > 50) throw new Error('Key response must be between 4 and 50');
		if (keyResponseLut.indexOf(keyResponse) === -1) throw new Error('Invalid key response');

		this.keyResponse = keyResponse;
		this.view.setInt8(10, keyResponse);
		return this;
	}

	build(mode: ConnectionMethod): Uint8Array<ArrayBuffer> {
		this.view.setInt16(11, this.calculateChecksum());
		if (mode === ConnectionMethod.Wired) return this.buffer.subarray(0, 13);
		else return this.buffer;
	}

	calculateChecksum(): number {
		let checksum = 0x00;
		for (let i = 3; i <= 10; i++) {
			checksum += this.view.getUint8(i);
		}
		return checksum;
	}
}

export type BrightnessLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ProfileId = number;

export enum LightMode {
	Off = 0x00,
	Static = 0x10,
	Breathing = 0x20,
	Neon = 0x30,
	ColorBreathing = 0x40,
	StaticDpi = 0x50,
	BreathingDpi = 0x60,
}

export type LedSpeed = 1 | 2 | 3 | 4 | 5;

export type KeyResponse =
	| 4
	| 6
	| 8
	| 10
	| 12
	| 14
	| 16
	| 18
	| 20
	| 22
	| 24
	| 26
	| 28
	| 30
	| 32
	| 34
	| 36
	| 38
	| 40
	| 42
	| 44
	| 46
	| 48
	| 50;

export type DeepSleepTime =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15
	| 16
	| 17
	| 18
	| 19
	| 20
	| 21
	| 22
	| 23
	| 24
	| 25
	| 26
	| 27
	| 28
	| 29
	| 30
	| 31
	| 32
	| 33
	| 34
	| 35
	| 36
	| 37
	| 38
	| 39
	| 40
	| 41
	| 42
	| 43
	| 44
	| 45
	| 46
	| 47
	| 48
	| 49
	| 50
	| 51
	| 52
	| 53
	| 54
	| 55
	| 56
	| 57
	| 58
	| 59
	| 60;

export type SleepTime =
	| 0.5
	| 1
	| 1.5
	| 2
	| 2.5
	| 3
	| 3.5
	| 4
	| 4.5
	| 5
	| 5.5
	| 6
	| 6.5
	| 7
	| 7.5
	| 8
	| 8.5
	| 9
	| 9.5
	| 10
	| 10.5
	| 11
	| 11.5
	| 12
	| 12.5
	| 13
	| 13.5
	| 14
	| 14.5
	| 15
	| 15.5
	| 16
	| 16.5
	| 17
	| 17.5
	| 18
	| 18.5
	| 19
	| 19.5
	| 20
	| 20.5
	| 21
	| 21.5
	| 22
	| 22.5
	| 23
	| 23.5
	| 24
	| 24.5
	| 25
	| 25.5
	| 26
	| 26.5
	| 27
	| 27.5
	| 28
	| 28.5
	| 29
	| 29.5
	| 30;

export enum ConnectionMethod {
	Wired = 0x80, // 128
	Wireless = 0x81, // 129
	Wired8KAlso = 0x82, // 130
	Wired8K = 0x83, // 131
	Bluetooth = 0x84, // 132
	WiredDual8K = 0x85, // 133
}

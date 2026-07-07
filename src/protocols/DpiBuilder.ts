import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { ConnectionMode, PacketLength, type ProfileId, ReportId } from '../types.js';
import type { RGB } from './LightingSettingsBuilder';

export const DPI_3311 = [
	0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x15, 0x16,
	0x17, 0x18, 0x19, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x29, 0x2a, 0x2b, 0x2c,
	0x2d, 0x2f, 0x30, 0x31, 0x32, 0x33, 0x34, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3d, 0x3e, 0x3f, 0x40, 0x41, 0x43,
	0x44, 0x45, 0x46, 0x47, 0x48, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0x51, 0x52, 0x53, 0x54, 0x55, 0x57, 0x58, 0x59,
	0x5a, 0x5b, 0x5c, 0x5e, 0x5f, 0x60, 0x61, 0x62, 0x63, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f,
	0x70, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7f, 0x80, 0x81, 0x82, 0x83, 0x84, 0x86,
	0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8d, 0x8e, 0x8f, 0x90, 0x91, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x9a, 0x9b, 0x9c,
	0x9d, 0x9e, 0x9f, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5, 0xa7, 0xa8, 0xa9, 0xaa, 0xab, 0xac, 0xae, 0xaf, 0xb0, 0xb1, 0xb2,
	0xb3, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xbb, 0xbc, 0xbd, 0xbe, 0xbf, 0xc0, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc9,
	0xca, 0xcb, 0xcc, 0xcd, 0xcf, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xdb, 0xdd, 0xde, 0xdf,
	0xe0, 0xe1, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xea, 0xeb, 0x76, 0x77, 0x79, 0x7a, 0x7b, 0x7c, 0x7d, 0x7f, 0x80,
	0x81, 0x82, 0x83, 0x84, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8d,
];

export interface DpiBuilderDefaultOptions {
	profileId: ProfileId;
	liftOffDistance: boolean;
	motionSync: boolean;
	angleSnap: boolean;
	rippleControl: boolean;
	currentStage: StageIndex;
	dpiValues: [number, number, number, number, number, number, number, number];
	dpiColors: [RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB];
}

export const dpiBuilderDefaultOptions: DpiBuilderDefaultOptions = {
	profileId: 1,
	angleSnap: false,
	currentStage: 2,
	liftOffDistance: false,
	motionSync: false,
	rippleControl: true,
	dpiValues: [800, 1600, 2400, 3200, 5000, 22000, 0, 0],
	dpiColors: [
		{ r: 0xff, g: 0x00, b: 0x00 },
		{ r: 0x00, g: 0xff, b: 0x00 },
		{ r: 0x00, g: 0x00, b: 0xff },
		{ r: 0xff, g: 0xff, b: 0x00 },
		{ r: 0x00, g: 0xff, b: 0xff },
		{ r: 0xff, g: 0x00, b: 0xff },
		{ r: 0xff, g: 0x40, b: 0x00 },
		{ r: 0xff, g: 0xff, b: 0xff },
	],
};

/**
 * Represents a stage index that can have one of the preset integer values.
 *
 * This type is used to define a sequential stage in a process or workflow.
 * It restricts the possible values to integers 1 through 6.
 */
export type StageIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface DpiBuilderOptions {
	profileId?: ProfileId;
	liftOffDistance?: boolean;
	motionSync?: boolean;
	angleSnap?: boolean;
	rippleControl?: boolean;
	currentStage?: StageIndex;
	dpiValues?: [number, number, number, number, number, number, number, number];
	dpiColors?: [RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB];
}

/**
 * Builder for configuring DPI and other sensor parameters of the Attack Shark X11.
 */
export class DpiBuilder implements BaseProtocolBuilder {
	readonly buffer: Buffer = Buffer.alloc(PacketLength.DPI);
	private view: DataView = new DataView(this.buffer.buffer);
	public readonly bmRequestType: number = 0x21;
	public readonly bRequest: number = 0x09;
	public readonly wValue: number = 0x0304;
	public readonly wIndex: number = 2;

	private profileId: ProfileId = dpiBuilderDefaultOptions.profileId;
	private liftOffDistance: boolean = dpiBuilderDefaultOptions.liftOffDistance;
	private motionSync: boolean = dpiBuilderDefaultOptions.motionSync;
	private angleSnap: boolean = dpiBuilderDefaultOptions.angleSnap;
	private rippleControl: boolean = dpiBuilderDefaultOptions.rippleControl;
	private currentStage: StageIndex = dpiBuilderDefaultOptions.currentStage;

	// noinspection FunctionTooLongJS
	constructor(options?: DpiBuilderOptions) {
		this.view.setInt8(0, ReportId.DPI); // report id
		this.view.setInt8(1, PacketLength.DPI); // length
		this.view.setInt8(2, 0x01); // profile id

		this.view.setInt8(3, 0x00); // lod | angle snap
		this.view.setInt8(4, 0x01); // motion sync | ripple control

		this.view.setInt8(5, 0x3f); // bitmask active stages

		this.view.setInt8(6, 0x20); // bitmask dpi X double flag
		this.view.setInt8(7, 0x20); // bitmask dpi Y double flag

		this.view.setInt8(8, 0x12); // dpi X stage 1
		this.view.setInt8(9, 0x25); // dpi X stage 2
		this.view.setInt8(10, 0x38); // dpi X stage 3
		this.view.setInt8(11, 0x4b); // dpi X stage 4
		this.view.setInt8(12, 0x75); // dpi X stage 5
		this.view.setInt8(13, 0x81); // dpi X stage 6
		this.view.setInt8(14, 0x00); // dpi X stage 7
		this.view.setInt8(25, 0x00); // dpi X stage 8

		this.view.setInt8(16, 0x00); // dpi Y stage 1
		this.view.setInt8(17, 0x00); // dpi Y stage 2
		this.view.setInt8(18, 0x00); // dpi Y stage 3
		this.view.setInt8(19, 0x00); // dpi Y stage 4
		this.view.setInt8(20, 0x00); // dpi Y stage 5
		this.view.setInt8(21, 0x01); // dpi Y stage 6
		this.view.setInt8(22, 0x00); // dpi Y stage 7
		this.view.setInt8(23, 0x00); // dpi Y stage 8

		this.view.setInt8(24, 0x02); // stage index

		this.view.setInt8(25, 0xff); // stage 1 Red
		this.view.setInt8(26, 0x00); // stage 1 Green
		this.view.setInt8(27, 0x00); // stage 1 Blue

		this.view.setInt8(28, 0x00); // stage 2 Red
		this.view.setInt8(29, 0xff); // stage 2 Green
		this.view.setInt8(30, 0x00); // stage 2 Blue

		this.view.setInt8(31, 0x00); // stage 3 Red
		this.view.setInt8(32, 0x00); // stage 3 Green
		this.view.setInt8(33, 0xff); // stage 3 Blue

		this.view.setInt8(34, 0xff); // stage 4 Red
		this.view.setInt8(35, 0xff); // stage 4 Green
		this.view.setInt8(36, 0x00); // stage 4 Blue

		this.view.setInt8(37, 0x00); // stage 5 Red
		this.view.setInt8(38, 0xff); // stage 5 Green
		this.view.setInt8(39, 0xff); // stage 5 Blue

		this.view.setInt8(40, 0xff); // stage 6 Red
		this.view.setInt8(41, 0x00); // stage 6 Green
		this.view.setInt8(42, 0xff); // stage 6 Blue

		this.view.setInt8(43, 0xff); // stage 7 Red
		this.view.setInt8(44, 0x40); // stage 7 Green
		this.view.setInt8(45, 0x00); // stage 7 Blue

		this.view.setInt8(46, 0xff); // stage 8 Red
		this.view.setInt8(47, 0xff); // stage 8 Green
		this.view.setInt8(48, 0xff); // stage 8 Blue

		// Even though the name explains the function of this byte,
		// it is still unclear what values can be passed to it and how that affects the mouse.
		this.view.setInt8(49, 0x02); // dpi active indicator

		this.view.setInt8(50, 0x0f); // checksum high byte
		this.view.setInt8(51, 0x68); // checksum low byte

		this.view.setInt8(52, 0x00); // padding wireless mode
		this.view.setInt8(53, 0x00); // padding wireless mode
		this.view.setInt8(54, 0x00); // padding wireless mode
		this.view.setInt8(55, 0x00); // padding wireless mode

		if (!options) return;

		if (options.profileId !== undefined) this.setProfileId(options.profileId);
		if (options.liftOffDistance !== undefined) this.setLiftOffDistance(options.liftOffDistance);
		if (options.motionSync !== undefined) this.setMotionSync(options.motionSync);
		if (options.angleSnap !== undefined) this.setAngleSnap(options.angleSnap);
		if (options.rippleControl !== undefined) this.setRippleControl(options.rippleControl);
		if (options.currentStage !== undefined) this.setCurrentStage(options.currentStage);

		if (options.dpiValues !== undefined) {
			for (let i = 0; i < 8; i++) {
				this.setDpiValue((i + 1) as StageIndex, options.dpiValues[i] ?? 0x00);
			}
		}

		if (options.dpiColors !== undefined) {
			for (let i = 0; i < 8; i++) {
				this.setRGB((i + 1) as StageIndex, options.dpiColors[i] ?? { r: 0, g: 0, b: 0 });
			}
		}
	}

	public setProfileId(id: ProfileId): this {
		this.profileId = id;

		this.view.setInt8(2, id);

		return this;
	}

	private setLiftOffDistance(toggle: boolean): this {
		this.liftOffDistance = toggle;

		const lodAndAngleSnappingByte = this.view.getUint8(3);

		const angleSnap = lodAndAngleSnappingByte & 0x0f;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(3, (toggleToByte << 4) | angleSnap);
		return this;
	}

	private setMotionSync(toggle: boolean): this {
		this.motionSync = toggle;

		const motionSyncAndRippleControl = this.view.getUint8(4);

		const rippleControl = motionSyncAndRippleControl & 0x0f;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(4, (toggleToByte << 4) | rippleControl);
		return this;
	}

	public setAngleSnap(toggle: boolean = false): this {
		this.angleSnap = toggle;

		const liftOffDistanceAndAngleSnapByte = this.view.getUint8(3);

		const liftOffDistance = liftOffDistanceAndAngleSnapByte & 0xf0;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(3, liftOffDistance | toggleToByte);
		return this;
	}

	public setRippleControl(toggle: boolean): this {
		this.rippleControl = toggle;

		const motionSyncAndRippleControl = this.view.getUint8(4);

		const motionSync = motionSyncAndRippleControl & 0xf0;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(4, motionSync | toggleToByte);
		return this;
	}

	public setCurrentStage(stage: StageIndex): this {
		this.currentStage = stage;

		this.view.setInt8(24, stage);
		return this;
	}

	public setDpiValue(stage: StageIndex, dpi: number): this {
		

		return this;
	}

	public setRGB(stage: StageIndex, rgb: RGB): this {
		switch (stage) {
			case 1: {
				this.buffer[25] = rgb.r;
				this.buffer[26] = rgb.g;
				this.buffer[27] = rgb.b;
				break;
			}
			case 2: {
				this.buffer[27] = rgb.r;
				this.buffer[29] = rgb.g;
				this.buffer[30] = rgb.b;
				break;
			}
			case 3: {
				this.buffer[31] = rgb.r;
				this.buffer[32] = rgb.g;
				this.buffer[33] = rgb.b;
				break;
			}
			case 4: {
				this.buffer[34] = rgb.r;
				this.buffer[35] = rgb.g;
				this.buffer[36] = rgb.b;
				break;
			}
			case 5: {
				this.buffer[37] = rgb.r;
				this.buffer[38] = rgb.g;
				this.buffer[39] = rgb.b;
				break;
			}
			case 6: {
				this.buffer[40] = rgb.r;
				this.buffer[41] = rgb.g;
				this.buffer[42] = rgb.b;
				break;
			}
			case 7: {
				this.buffer[43] = rgb.r;
				this.buffer[44] = rgb.g;
				this.buffer[45] = rgb.b;
				break;
			}
			case 8: {
				this.buffer[46] = rgb.r;
				this.buffer[47] = rgb.g;
				this.buffer[48] = rgb.b;
				break;
			}
			default: {
				throw new ParamsError('stage', `Invalid stage: ${stage}`);
			}
		}

		return this;
	}

	calculateChecksum(): this {
		let sum = 0;

		for (let i = 3; i <= 49; i++) {
			sum += this.buffer[i] ?? 0x00;
		}

		this.view.setInt16(50, sum);
		return this;
	}

	public build(mode: ConnectionMode): Buffer {
		this.calculateChecksum();

		return mode === ConnectionMode.Wired ? this.buffer.subarray(0, 51) : this.buffer;
	}

	public toString(): string {
		return this.buffer.toString('hex');
	}

	public compareWithHexString(value: string): boolean {
		return this.toString() === value;
	}
}

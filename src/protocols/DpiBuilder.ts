import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { ConnectionMode, PacketLength, type ProfileId, ReportId } from '../types.js';
import { convertDpiToBytes } from '../utils/dpi.js';
import type { RGB } from './LightingSettingsBuilder';

export interface DpiBuilderDefaultOptions {
	profileId: ProfileId;
	liftOffDistance: LiftOffDistance;
	motionSync: boolean;
	angleSnap: boolean;
	rippleControl: boolean;
	bitmaskActiveStages: number;
	currentStage: StageIndex;
	dpiValues: [number, number, number, number, number, number, number, number];
	dpiColors: [RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB];
}

export const dpiBuilderDefaultOptions: DpiBuilderDefaultOptions = {
	profileId: 1,
	angleSnap: false,
	currentStage: 2,
	liftOffDistance: 0,
	motionSync: false,
	rippleControl: true,
	bitmaskActiveStages: 0x3f,
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
 * It restricts the possible values to integers 1 through 8.
 */
export type StageIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LiftOffDistance = 0x0 | 0x01 | 0x2;

export interface DpiBuilderOptions {
	profileId?: ProfileId;
	liftOffDistance?: LiftOffDistance;
	motionSync?: boolean;
	angleSnap?: boolean;
	rippleControl?: boolean;
	activeStages?: number;
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
	private liftOffDistance: LiftOffDistance = dpiBuilderDefaultOptions.liftOffDistance;
	private motionSync: boolean = dpiBuilderDefaultOptions.motionSync;
	private angleSnap: boolean = dpiBuilderDefaultOptions.angleSnap;
	private rippleControl: boolean = dpiBuilderDefaultOptions.rippleControl;
	private currentStage: StageIndex = dpiBuilderDefaultOptions.currentStage;
	private activeStages: number = dpiBuilderDefaultOptions.bitmaskActiveStages;
	private dpiValues: number[] = [...dpiBuilderDefaultOptions.dpiValues];
	private dpiColors: RGB[] = [...dpiBuilderDefaultOptions.dpiColors];

	// noinspection FunctionTooLongJS
	constructor(options?: DpiBuilderOptions) {
		this.view.setInt8(0, ReportId.DPI); // Report ID
		this.view.setInt8(1, PacketLength.DPI); // Length
		this.view.setInt8(2, 0x01); // Profile ID

		this.view.setInt8(3, 0x00); // LOD | Angle Snap
		this.view.setInt8(4, 0x01); // Motion Sync | Ripple Control

		this.view.setInt8(5, 0x3f); // Bitmask Active Stages

		this.view.setInt8(6, 0x20); // Bitmask DPI X Double Flag
		this.view.setInt8(7, 0x20); // Bitmask DPI Y Triple Flag

		this.view.setInt8(8, 0x12); // DPI X Stage 1
		this.view.setInt8(9, 0x25); // DPI X Stage 2
		this.view.setInt8(10, 0x38); // DPI X Stage 3
		this.view.setInt8(11, 0x4b); // DPI X Stage 4
		this.view.setInt8(12, 0x75); // DPI X Stage 5
		this.view.setInt8(13, 0x81); // DPI X Stage 6
		this.view.setInt8(14, 0x00); // DPI X Stage 7
		this.view.setInt8(15, 0x00); // DPI X Stage 8

		this.view.setInt8(16, 0x00); // DPI Y Stage 1
		this.view.setInt8(17, 0x00); // DPI Y Stage 2
		this.view.setInt8(18, 0x00); // DPI Y Stage 3
		this.view.setInt8(19, 0x00); // DPI Y Stage 4
		this.view.setInt8(20, 0x00); // DPI Y Stage 5
		this.view.setInt8(21, 0x01); // DPI Y Stage 6
		this.view.setInt8(22, 0x00); // DPI Y Stage 7
		this.view.setInt8(23, 0x00); // DPI Y Stage 8

		this.view.setInt8(24, 0x02); // Stage Index

		this.view.setInt8(25, 0xff); // Stage 1 Red
		this.view.setInt8(26, 0x00); // Stage 1 Green
		this.view.setInt8(27, 0x00); // Stage 1 Blue

		this.view.setInt8(28, 0x00); // Stage 2 Red
		this.view.setInt8(29, 0xff); // Stage 2 Green
		this.view.setInt8(30, 0x00); // Stage 2 Blue

		this.view.setInt8(31, 0x00); // Stage 3 Red
		this.view.setInt8(32, 0x00); // Stage 3 Green
		this.view.setInt8(33, 0xff); // Stage 3 Blue

		this.view.setInt8(34, 0xff); // Stage 4 Red
		this.view.setInt8(35, 0xff); // Stage 4 Green
		this.view.setInt8(36, 0x00); // Stage 4 Blue

		this.view.setInt8(37, 0x00); // Stage 5 Red
		this.view.setInt8(38, 0xff); // Stage 5 Green
		this.view.setInt8(39, 0xff); // Stage 5 Blue

		this.view.setInt8(40, 0xff); // Stage 6 Red
		this.view.setInt8(41, 0x00); // Stage 6 Green
		this.view.setInt8(42, 0xff); // Stage 6 Blue

		this.view.setInt8(43, 0xff); // Stage 7 Red
		this.view.setInt8(44, 0x40); // Stage 7 Green
		this.view.setInt8(45, 0x00); // Stage 7 Blue

		this.view.setInt8(46, 0xff); // Stage 8 Red
		this.view.setInt8(47, 0xff); // Stage 8 Green
		this.view.setInt8(48, 0xff); // Stage 8 Blue

		// Even though the name explains the function of this byte,
		// it is still unclear what values can be passed to it and how that affects the mouse.
		this.view.setInt8(49, 0x02); // DPI Active Indicator

		this.view.setInt8(50, 0x0f); // Checksum High Byte
		this.view.setInt8(51, 0x68); // Checksum Low Byte

		this.view.setInt8(52, 0x00); // Padding Wireless Mode
		this.view.setInt8(53, 0x00); // Padding Wireless Mode
		this.view.setInt8(54, 0x00); // Padding Wireless Mode
		this.view.setInt8(55, 0x00); // Padding Wireless Mode

		if (!options) return;

		if (options.profileId !== undefined) this.setProfileId(options.profileId);
		if (options.liftOffDistance !== undefined) this.setLiftOffDistance(options.liftOffDistance);
		if (options.motionSync !== undefined) this.setMotionSync(options.motionSync);
		if (options.angleSnap !== undefined) this.setAngleSnap(options.angleSnap);
		if (options.rippleControl !== undefined) this.setRippleControl(options.rippleControl);
		if (options.activeStages !== undefined) this.setActiveStages(options.activeStages);
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

	public getProfileId(): ProfileId {
		return this.profileId;
	}

	public setProfileId(id: ProfileId): this {
		this.profileId = id;

		this.view.setInt8(2, id);

		return this;
	}

	public getLiftOffDistance(): LiftOffDistance {
		return this.liftOffDistance;
	}

	// Even though it is publicly available, its use is still not recommended,
	// as the model does not support this option at the firmware level.
	public setLiftOffDistance(lift: LiftOffDistance): this {
		this.liftOffDistance = lift;

		const lodAndAngleSnappingByte = this.view.getUint8(3);

		const angleSnap = lodAndAngleSnappingByte & 0x0f;

		this.view.setInt8(3, (lift << 4) | angleSnap);
		return this;
	}

	public getMotionSync(): boolean {
		return this.motionSync;
	}

	// Even though it is publicly available, its use is still not recommended,
	// as the model does not support this option at the firmware level.
	public setMotionSync(toggle: boolean): this {
		this.motionSync = toggle;

		const motionSyncAndRippleControl = this.view.getUint8(4);

		const rippleControl = motionSyncAndRippleControl & 0x0f;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(4, (toggleToByte << 4) | rippleControl);
		return this;
	}

	public getAngleSnap(): boolean {
		return this.angleSnap;
	}

	public setAngleSnap(toggle: boolean): this {
		this.angleSnap = toggle;

		const liftOffDistanceAndAngleSnapByte = this.view.getUint8(3);

		const liftOffDistance = liftOffDistanceAndAngleSnapByte & 0xf0;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(3, liftOffDistance | toggleToByte);
		return this;
	}

	public getRippleControl(): boolean {
		return this.rippleControl;
	}

	public setRippleControl(toggle: boolean): this {
		this.rippleControl = toggle;

		const motionSyncAndRippleControl = this.view.getUint8(4);

		const motionSync = motionSyncAndRippleControl & 0xf0;
		const toggleToByte = toggle ? 0x01 : 0x00;

		this.view.setInt8(4, motionSync | toggleToByte);
		return this;
	}

	public getActiveStages(): number {
		return this.activeStages;
	}

	public setActiveStages(stages: number): this {
		this.activeStages = stages;

		this.view.setInt8(5, stages);

		return this;
	}

	public getCurrentStage(): StageIndex {
		return this.currentStage;
	}

	public setCurrentStage(stage: StageIndex): this {
		this.currentStage = stage;

		this.view.setInt8(24, stage);
		return this;
	}

	public getDpiValue(stage: StageIndex): number {
		return this.dpiValues[stage - 1] ?? 0;
	}

	public getDpiValues(): number[] {
		return [...this.dpiValues];
	}

	public setDpiValue(stage: StageIndex, dpi: number): this {
		this.dpiValues[stage - 1] = dpi;
		const { xByte, yByte, isDouble, isTriple } = convertDpiToBytes(dpi);
		const stageIdx = stage - 1;

		this.view.setUint8(8 + stageIdx, xByte);
		this.view.setUint8(16 + stageIdx, yByte);

		let doubleFlags = this.view.getUint8(6);
		let tripleFlags = this.view.getUint8(7);

		if (isDouble) {
			doubleFlags |= 1 << stageIdx;
		} else {
			doubleFlags &= ~(1 << stageIdx);
		}

		if (isTriple) {
			tripleFlags |= 1 << stageIdx;
		} else {
			tripleFlags &= ~(1 << stageIdx);
		}

		this.view.setUint8(6, doubleFlags);
		this.view.setUint8(7, tripleFlags);

		return this;
	}

	public getRGB(stage: StageIndex): RGB {
		return this.dpiColors[stage - 1] ?? { r: 0, g: 0, b: 0 };
	}

	public getDpiColors(): RGB[] {
		return [...this.dpiColors];
	}

	public setRGB(stage: StageIndex, rgb: RGB): this {
		this.dpiColors[stage - 1] = rgb;
		switch (stage) {
			case 1: {
				this.buffer[25] = rgb.r;
				this.buffer[26] = rgb.g;
				this.buffer[27] = rgb.b;
				break;
			}
			case 2: {
				this.buffer[28] = rgb.r;
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

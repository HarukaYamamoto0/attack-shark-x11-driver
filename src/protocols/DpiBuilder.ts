import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { DPI_STEP_MAP } from '../tables/dpi-map.js';
import { ConnectionMode, type RGB } from '../types.js';

export enum ActiveStages {
	None = 0,
	Stage1 = 1 << 0,
	Stage2 = 1 << 1,
	Stage3 = 1 << 2,
	Stage4 = 1 << 3,
	Stage5 = 1 << 4,
	Stage6 = 1 << 5,
	Stage7 = 1 << 6,
	Stage8 = 1 << 7,
}

export type LiftOffDistance = 1 | 2; // 0.7 MM
export type DpiValues = [number, number, number, number, number, number, number, number];
export type DpiStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type DpiColors = [RGB, RGB, RGB, RGB, RGB, RGB, RGB, RGB];

export interface DpiBuilderOptions {
	activeStages?: ActiveStages;
	motionSync?: boolean;
	liftOffDistance?: LiftOffDistance;
	angleSnap?: boolean;
	ripplerControl?: boolean;
	dpiValues?: DpiValues;
	currentStage?: DpiStage;
	dpiColors?: DpiColors;
}

/**
 * Builder for configuring DPI and other sensor parameters of the Attack Shark X11.
 */
export class DpiBuilder implements BaseProtocolBuilder {
	public readonly bmRequestType: number = 0x21;
	public readonly bRequest: number = 0x09;
	public readonly wValue: number = 0x0304;
	public readonly wIndex: number = 2;
	public static readonly DEFAULT_OPTIONS: DpiBuilderOptions = {
		activeStages:
			ActiveStages.Stage1 |
			ActiveStages.Stage2 |
			ActiveStages.Stage3 |
			ActiveStages.Stage4 |
			ActiveStages.Stage5 |
			ActiveStages.Stage6,
		liftOffDistance: 2,
		angleSnap: false,
		ripplerControl: true,
		dpiValues: [800, 1600, 2400, 3200, 5000, 22000, 0, 0],
		currentStage: 2,
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
	readonly buffer = Buffer.alloc(56);
	public options: DpiBuilderOptions;

	// noinspection FunctionTooLongJS
	constructor(options?: DpiBuilderOptions) {
		this.buffer[0] = 0x04; // Report ID
		this.buffer[1] = 0x38; // Report Size

		this.buffer[2] = 0x01; // fixed, possible Motion Sync (On, Off)
		this.buffer[3] = 0x00; // angle snap
		this.buffer[4] = 0x01; // ripple control

		this.buffer[5] = 0x3f; // Stage Active; 3f == 0011 1111, each bit represents a stage going from right to left, used in the DPI Cycle button.
		this.buffer[6] = 0x20; // stage mask; 20 == 0010 0000, each bit represents a stage going from right to left, it tells you which stage is high. (>=0x8e)
		this.buffer[7] = 0x20; // duplicate from index 6

		this.buffer[8] = 0x12; // stage 1 value
		this.buffer[9] = 0x25; // stage 2 value
		this.buffer[10] = 0x38; // stage 3 value
		this.buffer[11] = 0x4b; // stage 4 value
		this.buffer[12] = 0x75; // stage 5 value
		this.buffer[13] = 0x81; // stage 6 value
		this.buffer[14] = 0x00; // stage 7 value
		this.buffer[15] = 0x00; // stage 8 value

		this.buffer[16] = 0x00; // high stage 1
		this.buffer[17] = 0x00; // high stage 2
		this.buffer[18] = 0x00; // high stage 3
		this.buffer[19] = 0x00; // high stage 4
		this.buffer[20] = 0x00; // high stage 5
		this.buffer[21] = 0x01; // high stage 6
		this.buffer[22] = 0x00; // high stage 7
		this.buffer[23] = 0x00; // high stage 8

		this.buffer[24] = 0x02; // stage index

		this.buffer[25] = 0xff; // RGB color for stage 1
		this.buffer[26] = 0x00; // RGB color for stage 1
		this.buffer[27] = 0x00; // RGB color for stage 1

		this.buffer[28] = 0x00; // RGB color for stage 2
		this.buffer[29] = 0xff; // RGB color for stage 2
		this.buffer[30] = 0x00; // RGB color for stage 2

		this.buffer[31] = 0x00; // RGB color for stage 3
		this.buffer[32] = 0x00; // RGB color for stage 3
		this.buffer[33] = 0xff; // RGB color for stage 3

		this.buffer[34] = 0xff; // RGB color for stage 4
		this.buffer[35] = 0xff; // RGB color for stage 4
		this.buffer[36] = 0x00; // RGB color for stage 4

		this.buffer[37] = 0x00; // RGB color for stage 5
		this.buffer[38] = 0xff; // RGB color for stage 5
		this.buffer[39] = 0xff; // RGB color for stage 5

		this.buffer[40] = 0xff; // RGB color for stage 6
		this.buffer[41] = 0x00; // RGB color for stage 6
		this.buffer[42] = 0xff; // RGB color for stage 6

		this.buffer[43] = 0xff; // RGB color for stage 7
		this.buffer[44] = 0x40; // RGB color for stage 7
		this.buffer[45] = 0x00; // RGB color for stage 7

		this.buffer[46] = 0xff; // RGB color for stage 8
		this.buffer[47] = 0xff; // RGB color for stage 8
		this.buffer[48] = 0xff; // RGB color for stage 8

		this.buffer[49] = 0x02; // fixed, possible LOD (Lift Off Distance) - 0.7MM, 1 MM, 2 MM
		this.buffer[50] = 0x0f; // checksum high byte
		this.buffer[51] = 0x68; // checksum low byte

		this.buffer[52] = 0x00; // padding wireless mode
		this.buffer[53] = 0x00; // padding wireless mode
		this.buffer[54] = 0x00; // padding wireless mode
		this.buffer[55] = 0x00; // padding wireless mode

		this.options = { ...DpiBuilder.DEFAULT_OPTIONS, ...options };

		if (this.options.dpiValues !== undefined) this.setDpiValues(this.options.dpiValues);
		if (this.options.motionSync !== undefined) this.setMotionSync(this.options.motionSync);
		if (this.options.activeStages !== undefined) this.setActiveStages(this.options.activeStages);
		if (this.options.currentStage !== undefined) this.setCurrentStage(this.options.currentStage);
		if (this.options.dpiColors !== undefined) this.setDpiColors(this.options.dpiColors);
		if (this.options.liftOffDistance !== undefined) this.setLiftOffDistance(this.options.liftOffDistance);
	}

	/**
	 * Defines whether Angle Snapping (straight line correction) should be active.
	 */
	public setAngleSnap(active: boolean = false): this {
		this.buffer[3] = active ? 0x01 : 0x00;
		return this;
	}

	/**
	 * Defines whether Ripple Control (sensor noise smoothing) should be active.
	 */
	public setRipplerControl(active: boolean = true): this {
		this.buffer[4] = active ? 0x01 : 0x00;
		return this;
	}

	public setActiveStages(activeStages: ActiveStages): this {
		this.buffer[5] = activeStages;
		return this;
	}

	/**
	 * Defines which DPI stage is currently active (1 to 8).
	 * @param stage Stage index (StageIndex).
	 */
	public setCurrentStage(stage: DpiStage): this {
		this.buffer[24] = typeof stage === 'number' ? stage : 0x02;
		return this;
	}

	/**
	 * Sets the DPI values for all 6 stages.
	 *
	 * @param stages Array of 6 DPI values.
	 * @return {this} The instance for method chaining.
	 */
	public setDpiValues(stages: DpiValues): this {
		if (!Array.isArray(stages) || stages.length !== 8)
			throw new ParamsError(
				'stages',
				`You need to pass the 8 DPI values; e.g.: [800, 1600, 2400, 3200, 5000, 22000, 0, 0]`,
			);

		for (let i = 0; i < stages.length; i++) {
			// @ts-expect-error the presence of 8 indices has already been validated
			this.buffer[8 + i] = this.encodeDpi(stages[i]);
		}
		return this;
	}

	private encodeDpi(dpi: number): number {
		const keys = Object.keys(DPI_STEP_MAP)
			.map(Number)
			.sort((a, b) => a - b);

		const match = keys.find((k) => k >= dpi);

		if (match === undefined) {
			throw new ParamsError('dpi', `Unsupported DPI: ${dpi}`);
		}

		return DPI_STEP_MAP[match] ?? 0x00;
	}

	private updateStageMask(): void {
		let mask = 0x00;

		for (let stage = 0; stage < 8; stage++) {
			// @ts-expect-error the value is known and valid
			if (this.options.dpiValues[stage] > 12000) {
				mask |= 1 << stage;
			}
		}
		this.buffer[6] = mask;
		this.buffer[7] = mask;
	}

	// TODO: This function is nothing more than a well-placed guess that solves 90% of common DPI issues
	// I believe it's necessary to directly reverse engineer the software to truly understand how it's done.
	// If anyone could do that, I would be immensely grateful.
	private updateHighStageFlags(): void {
		for (let i = 0; i < 8; i++) {
			// @ts-expect-error default values
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const dpi = this.options.dpiValues[i]!;
			if ((dpi >= 10100 && dpi <= 12000) || (dpi >= 20100 && dpi <= 22000)) {
				this.buffer[16 + i] = 0x01;
			} else {
				this.buffer[16 + i] = 0x00;
			}
		}
	}

	public setMotionSync(motionSync: boolean): this {
		if (typeof motionSync !== 'boolean')
			throw new Error('The `motionSync` key expects a valid boolean; see the documentation.');

		this.buffer[2] = motionSync ? 0x01 : 0x00;
		return this;
	}

	public setDpiColors(dpiColors: DpiColors): this {
		let stageColorCounter = 25;

		for (let i = 0; i < dpiColors.length; i++) {
			// @ts-expect-error the value is known and valid
			this.buffer[stageColorCounter] = (dpiColors[i].r ?? DpiBuilder.DEFAULT_OPTIONS.dpiColors[i].r) & 0xff;
			// @ts-expect-error the value is known and valid
			this.buffer[stageColorCounter + 1] = (dpiColors[i].g ?? DpiBuilder.DEFAULT_OPTIONS.dpiColors[i].g) & 0xff;
			// @ts-expect-error the value is known and valid
			this.buffer[stageColorCounter + 2] = (dpiColors[i].b ?? DpiBuilder.DEFAULT_OPTIONS.dpiColors[i].b) & 0xff;
			stageColorCounter += 3;
		}

		return this;
	}

	public setLiftOffDistance(liftOffDistance: LiftOffDistance): this {
		if (typeof liftOffDistance !== 'number')
			throw new Error('The `liftOffDistance` key expects a valid number; see the documentation.');

		switch (liftOffDistance) {
			// case 0.7: {
			// 	this.buffer[49] = 0x01;
			// 	break;
			// }
			case 1: {
				this.buffer[49] = 0x01;
				break;
			}
			case 2: {
				this.buffer[49] = 0x02;
				break;
			}
			default: {
				throw new Error('This value has not yet been implemented for the `liftOffDistance` key');
			}
		}
		return this;
	}

	calculateChecksum(): number {
		let sum = 0;

		for (let i = 3; i <= 49; i++) {
			sum += this.buffer[i] ?? 0x00;
		}

		return sum & 0xffff;
	}

	public build(mode: ConnectionMode): Buffer {
		this.updateStageMask();
		this.updateHighStageFlags();

		const checksum = this.calculateChecksum();
		this.buffer.writeUInt16BE(checksum, 50);

		return mode === ConnectionMode.Wired ? this.buffer.subarray(0, 52) : this.buffer;
	}

	public toString(): string {
		return this.buffer.toString('hex');
	}

	compareWithHexString(value: string): boolean {
		return this.toString() === value;
	}
}

import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { DPI_STEP_MAP } from '../tables/dpi-map.js';
import { ConnectionMode } from '../types.js';

const OFFSET = Object.freeze({
	ANGLE_SNAP: 3,
	RIPPLER_CONTROL: 4,
	STAGE_MASK_A: 6,
	STAGE_MASK_B: 7,
	EXPANDED_MASK: 16,
	CURRENT_STAGE: 24,
	CHECKSUM_HIGH_BYTE: 50,
	CHECKSUM_LOW_BYTE: 51,
	STAGES_START: 8,
});

/**
 * Represents a stage index that can have one of the preset integer values.
 *
 * This type is used to define a sequential stage in a process or workflow.
 * It restricts the possible values to integers 1 through 6.
 */
export type StageIndex = 1 | 2 | 3 | 4 | 5 | 6;

export interface DpiBuilderOptions {
	angleSnap?: boolean;
	ripplerControl?: boolean;
	dpiValues?: [number, number, number, number, number, number];
	activeStage?: StageIndex;
}

/**
 * Builder for configuring DPI and other sensor parameters of the Attack Shark X11.
 */
export class DpiBuilder implements BaseProtocolBuilder {
	public static readonly DEFAULT_OPTIONS: DpiBuilderOptions = {
		angleSnap: false,
		ripplerControl: true,
		dpiValues: [800, 1600, 2400, 3200, 5000, 22000],
		activeStage: 2,
	};
	readonly buffer: Buffer;
	public readonly bmRequestType: number = 0x21;
	public readonly bRequest: number = 0x09;
	public readonly wValue: number = 0x0304;
	public readonly wIndex: number = 2;
	private stages: [number, number, number, number, number, number] = [800, 1600, 2400, 3200, 5000, 22000];

	// noinspection FunctionTooLongJS
	constructor(options?: DpiBuilderOptions) {
		this.buffer = Buffer.alloc(56);

		this.buffer[0] = 0x04; // header
		this.buffer[1] = 0x38; // header
		this.buffer[2] = 0x01; // header

		this.buffer[OFFSET.ANGLE_SNAP] = 0x00; // angle snap
		this.buffer[OFFSET.RIPPLER_CONTROL] = 0x01; // ripple control

		this.buffer[5] = 0x3f; // fixed

		this.buffer[OFFSET.STAGE_MASK_A] = 0x20; // stage mask
		this.buffer[OFFSET.STAGE_MASK_B] = 0x20; // stage mask

		this.buffer[8] = 0x12; // stage 1 value
		this.buffer[9] = 0x25; // stage 2 value
		this.buffer[10] = 0x38; // stage 3 value
		this.buffer[11] = 0x4b; // stage 4 value
		this.buffer[12] = 0x75; // stage 5 value
		this.buffer[13] = 0x81; // stage 6 value

		this.buffer[14] = 0x00; // fixed
		this.buffer[15] = 0x00; // fixed

		this.buffer[16] = 0x00; // high stage 1
		this.buffer[17] = 0x00; // high stage 2
		this.buffer[18] = 0x00; // high stage 3
		this.buffer[19] = 0x00; // high stage 4
		this.buffer[20] = 0x00; // high stage 5
		this.buffer[21] = 0x01; // high stage 6

		this.buffer[22] = 0x00; // fixed
		this.buffer[23] = 0x00; // fixed
		this.buffer[OFFSET.CURRENT_STAGE] = 0x02; // stage index
		this.buffer[25] = 0xff; // fixed
		this.buffer[26] = 0x00; // fixed
		this.buffer[27] = 0x00; // fixed
		this.buffer[28] = 0x00; // fixed
		this.buffer[29] = 0xff; // fixed
		this.buffer[30] = 0x00; // fixed
		this.buffer[31] = 0x00; // fixed

		this.buffer[32] = 0x00; // fixed
		this.buffer[33] = 0xff; // fixed
		this.buffer[34] = 0xff; // fixed
		this.buffer[35] = 0xff; // fixed
		this.buffer[36] = 0x00; // fixed
		this.buffer[37] = 0x00; // fixed
		this.buffer[38] = 0xff; // fixed
		this.buffer[39] = 0xff; // fixed
		this.buffer[40] = 0xff; // fixed
		this.buffer[41] = 0x00; // fixed
		this.buffer[42] = 0xff; // fixed
		this.buffer[43] = 0xff; // fixed
		this.buffer[44] = 0x40; // fixed
		this.buffer[45] = 0x00; // fixed
		this.buffer[46] = 0xff; // fixed
		this.buffer[47] = 0xff; // fixed

		this.buffer[48] = 0xff; // fixed
		this.buffer[49] = 0x02; // fixed
		this.buffer[50] = 0x0f; // checksum high byte
		this.buffer[51] = 0x68; // checksum low byte

		this.buffer[52] = 0x00; // padding wireless mode
		this.buffer[53] = 0x00; // padding wireless mode
		this.buffer[54] = 0x00; // padding wireless mode
		this.buffer[55] = 0x00; // padding wireless mode

		const config = { ...DpiBuilder.DEFAULT_OPTIONS, ...options };

		if (config.angleSnap !== undefined) this.setAngleSnap(config.angleSnap);
		if (config.ripplerControl !== undefined) this.setRipplerControl(config.ripplerControl);
		if (config.dpiValues !== undefined) this.setStages(config.dpiValues);
		if (config.activeStage !== undefined) this.setCurrentStage(config.activeStage);
	}

	/**
	 * Defines whether Angle Snapping (straight line correction) should be active.
	 * @param active True to activate. Default: false.
	 */
	public setAngleSnap(active: boolean = false): this {
		this.buffer[OFFSET.ANGLE_SNAP] = active ? 0x01 : 0x00;
		return this;
	}

	/**
	 * Defines whether Ripple Control (sensor noise smoothing) should be active.
	 * @param active True to activate. Default: true.
	 */
	public setRipplerControl(active: boolean = true): this {
		this.buffer[OFFSET.RIPPLER_CONTROL] = active ? 0x01 : 0x00;
		return this;
	}

	/**
	 * Defines which DPI stage is currently active (1 to 6).
	 * @param stage Stage index (StageIndex).
	 */
	public setCurrentStage(stage: StageIndex): this {
		this.buffer[OFFSET.CURRENT_STAGE] = stage;
		return this;
	}

	/**
	 * Sets the DPI value for a specific stage.
	 * @param stage Stage index (1 to 6).
	 * @param dpi DPI value (must be supported by the sensor).
	 */
	public setDpiValue(stage: StageIndex, dpi: number): this {
		const index = stage - 1;

		this.stages[index] = dpi;
		this.buffer[OFFSET.STAGES_START + index] = this.encodeDpi(dpi);

		return this;
	}

	/**
	 * Sets the DPI values for all 6 stages.
	 *
	 * @param stages Array of 6 DPI values.
	 * @return {this} The instance for method chaining.
	 */
	public setStages(stages: [number, number, number, number, number, number]): this {
		if (!Array.isArray(stages) || stages.length !== this.stages.length)
			throw new ParamsError(
				'stages',
				`You need to pass the 6 DPI values; e.g.: [800, 1600, 2400, 3200, 5000, 22000]`,
			);

		for (let i = 0; i < stages.length; i++) {
			this.setDpiValue((i + 1) as StageIndex, stages[i] ?? 0x00);
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
		this.buffer.writeUInt16BE(checksum, OFFSET.CHECKSUM_HIGH_BYTE);

		return mode === ConnectionMode.Wired ? this.buffer.subarray(0, OFFSET.CHECKSUM_LOW_BYTE + 1) : this.buffer;
	}

	public toString(): string {
		return this.buffer.toString('hex');
	}

	public compareWithHexString(value: string): boolean {
		return this.toString() === value;
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
		const bitValues = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];
		let mask = 0x00;

		for (let i = 0; i < this.stages.length; i++) {
			// Mask bit is set if DPI is greater than 12,000
			if ((this.stages[i] ?? 0x00) > 12000) {
				mask |= bitValues[i] ?? 0x00;
			}
		}

		this.buffer[OFFSET.STAGE_MASK_A] = mask;
		this.buffer[OFFSET.STAGE_MASK_B] = mask;
	}

	private updateHighStageFlags(): void {
		for (let i = 0; i < this.stages.length; i++) {
			const dpi = this.stages[i] ?? 0x00;
			// See docs/samples/dpi-stage-mask.txt:
			// Bytes 16-21 (High Stage Flags) are set to 0x01 if DPI is in range [10100, 12000] or [20100, 22000]
			if ((dpi >= 10100 && dpi <= 12000) || (dpi >= 20100 && dpi <= 22000)) {
				this.buffer[OFFSET.EXPANDED_MASK + i] = 0x01;
			} else {
				this.buffer[OFFSET.EXPANDED_MASK + i] = 0x00;
			}
		}
	}
}

import {ConnectionMode} from "../types.js";
import {DPI_STEP_MAP} from "../tables/dpi-map.js";
import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";

const OFFSET = {
    ANGLE_SNAP: 3,
    RIPPLER_CONTROL: 4,
    STAGE_MASK_A: 6,
    STAGE_MASK_B: 7,
    EXPANDED_MASK: 16,
    CURRENT_STAGE: 24,
    CHECKSUM_HIGH_BYTE: 50,
    CHECKSUM_LOW_BYTE: 51,
    STAGES_START: 8,
} as const;

/**
 * Represents a stage index that can have one of the preset integer values.
 *
 * This type is used to define a sequential stage in a process or workflow.
 * It restricts the possible values to integers 1 through 6.
 */
export type StageIndex = 1 | 2 | 3 | 4 | 5 | 6

export interface DpiBuilderOptions {
    angleSnap?: boolean
    ripplerControl?: boolean
    dpiValues?: [number, number, number, number, number, number]
    activeStage?: StageIndex
}

/**
 * Builder for configuring the DPI of the Attack Shark X11
 */
export class DpiBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer = Buffer.alloc(64);
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    stages: [number, number, number, number, number, number] = [800, 1600, 2400, 3200, 5000, 22000];

    public static readonly DEFAULT_OPTIONS: DpiBuilderOptions = {
        angleSnap: false,
        ripplerControl: true,
        dpiValues: [800, 1600, 2400, 3200, 5000, 22000],
        activeStage: 2,
    };

    // noinspection FunctionTooLongJS
    constructor(options?: DpiBuilderOptions) {
        this.buffer = Buffer.alloc(56)

        this.buffer[0] = 0x04 // header
        this.buffer[1] = 0x38 // header
        this.buffer[2] = 0x01 // header

        this.buffer[OFFSET.ANGLE_SNAP] = 0x00 // angle snap
        this.buffer[OFFSET.RIPPLER_CONTROL] = 0x01 // ripple control

        this.buffer[5] = 0x3F // fixed

        this.buffer[OFFSET.STAGE_MASK_A] = 0x20 // stage mask
        this.buffer[OFFSET.STAGE_MASK_B] = 0x20 // stage mask

        this.buffer[8] = 0x12 // stage 1 value
        this.buffer[9] = 0x25 // stage 2 value
        this.buffer[10] = 0x38 // stage 3 value
        this.buffer[11] = 0x4B // stage 4 value
        this.buffer[12] = 0x75 // stage 5 value
        this.buffer[13] = 0x81 // stage 6 value

        this.buffer[14] = 0x00 // fixed
        this.buffer[15] = 0x00 // fixed

        this.buffer[16] = 0x00 // high stage 1
        this.buffer[17] = 0x00 // high stage 2
        this.buffer[18] = 0x00 // high stage 3
        this.buffer[19] = 0x00 // high stage 4
        this.buffer[20] = 0x00 // high stage 5
        this.buffer[21] = 0x01 // high stage 6

        this.buffer[22] = 0x00 // fixed
        this.buffer[23] = 0x00 // fixed
        this.buffer[OFFSET.CURRENT_STAGE] = 0x02 // stage index
        this.buffer[25] = 0xFF // fixed
        this.buffer[26] = 0x00 // fixed
        this.buffer[27] = 0x00 // fixed
        this.buffer[28] = 0x00 // fixed
        this.buffer[29] = 0xFF // fixed
        this.buffer[30] = 0x00 // fixed
        this.buffer[31] = 0x00 // fixed

        this.buffer[32] = 0x00 // fixed
        this.buffer[33] = 0xFF // fixed
        this.buffer[34] = 0xFF // fixed
        this.buffer[35] = 0xFF // fixed
        this.buffer[36] = 0x00 // fixed
        this.buffer[37] = 0x00 // fixed
        this.buffer[38] = 0xFF // fixed
        this.buffer[39] = 0xFF // fixed
        this.buffer[40] = 0xFF // fixed
        this.buffer[41] = 0x00 // fixed
        this.buffer[42] = 0xFF // fixed
        this.buffer[43] = 0xFF // fixed
        this.buffer[44] = 0x40 // fixed
        this.buffer[45] = 0x00 // fixed
        this.buffer[46] = 0xFF // fixed
        this.buffer[47] = 0xFF // fixed

        this.buffer[48] = 0xFF // fixed
        this.buffer[49] = 0x02 // fixed
        this.buffer[50] = 0x0F // checksum high byte
        this.buffer[51] = 0x68 // checksum low byte

        this.buffer[52] = 0x00 // padding wireless mode
        this.buffer[53] = 0x00 // padding wireless mode
        this.buffer[54] = 0x00 // padding wireless mode
        this.buffer[55] = 0x00 // padding wireless mode

        const config = {...DpiBuilder.DEFAULT_OPTIONS, ...options};

        if (config.angleSnap !== undefined) this.setAngleSnap(config.angleSnap)
        if (config.ripplerControl !== undefined) this.setRipplerControl(config.ripplerControl)
        if (config.dpiValues !== undefined) this.setStages(config.dpiValues)
        if (config.activeStage !== undefined) this.setCurrentStage(config.activeStage);
    }

    /**
     * Sets the angle snapping behavior for the object.
     *
     * @param {boolean} [active=false] - Determines whether angle snapping should be enabled.
     *                                   If `true`, angle snapping is activated; if `false`, it is disabled.
     * @return {this} The current instance for method chaining.
     */
    public setAngleSnap(active: boolean = false): this {
        this.buffer[OFFSET.ANGLE_SNAP] = active ? 0x01 : 0x00;
        return this;
    }

    /**
     * Sets the rippler control state.
     *
     * @param {boolean} [active=true] - A boolean value indicating whether the rippler control is active or inactive. Defaults to `true`.
     * @return {this} The current instance for method chaining.
     */
    public setRipplerControl(active: boolean = true): this {
        this.buffer[OFFSET.RIPPLER_CONTROL] = active ? 0x01 : 0x00;
        return this;
    }

    /**
     * Sets the current stage of the process.
     *
     * @param {StageIndex} stage - The stage index to set as the current stage.
     * @return {this} The instance of the current object for method chaining.
     */
    public setCurrentStage(stage: StageIndex): this {
        this.buffer[OFFSET.CURRENT_STAGE] = stage;
        return this;
    }

    /**
     * Sets the DPI (dots per inch) value for a specific stage.
     *
     * @param {StageIndex} stage - The index of the stage for which the DPI value is being set.
     * @param {number} dpi - The DPI value to assign to the specified stage.
     * @return {this} The instance of the class for method chaining.
     */
    public setDpiValue(stage: StageIndex, dpi: number): this {
        const index = (stage - 1);

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
            throw new Error(`You need to pass the 6 DPI values; e.g.: [800, 1600, 2400, 3200, 5000, 22000]`)

        for (let i = 0; i < stages.length; i++) {
            this.setDpiValue((i + 1) as StageIndex, stages[i]!)
        }
        return this
    }

    private encodeDpi(dpi: number): number {
        const keys = Object.keys(DPI_STEP_MAP)
            .map(Number)
            .sort((a, b) => a - b);

        const match = keys.find(k => k >= dpi);

        if (match === undefined) {
            throw new Error(`Unsupported DPI: ${dpi}`);
        }

        return DPI_STEP_MAP[match]!;
    }

    private updateStageMask(): void {
        const bitValues = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20];
        let mask = 0x00;

        for (let i = 0; i < this.stages.length; i++) {
            if (this.stages[i]! > 12000) {
                mask |= bitValues[i]!;
            }
        }

        this.buffer[OFFSET.STAGE_MASK_A] = mask;
        this.buffer[OFFSET.STAGE_MASK_B] = mask;
    }

    private updateHighStageFlags(): void {
        for (let i = 0; i < this.stages.length; i++) {
            this.buffer[OFFSET.EXPANDED_MASK + i] =
                this.stages[i]! > 10000 ? 0x01 : 0x00;
        }
    }


    calculateChecksum(): number {
        let sum = 0;

        for (let i = 3; i <= 49; i++) {
            sum += this.buffer[i]!;
        }

        return sum & 0xffff
    }

    public build(mode: ConnectionMode): Buffer {
        this.updateStageMask();
        this.updateHighStageFlags();

        const checksum = this.calculateChecksum();

        this.buffer[OFFSET.CHECKSUM_HIGH_BYTE] = (checksum >> 8) & 0xff;
        this.buffer[OFFSET.CHECKSUM_LOW_BYTE] = checksum & 0xff;

        return mode === ConnectionMode.Wired
            ? this.buffer.subarray(0, OFFSET.CHECKSUM_LOW_BYTE + 1)
            : this.buffer;
    }

    public toString(): string {
        return this.buffer.toString("hex");
    }

    public compareWithHexString(value: string): boolean {
        return this.toString() == value
    }
}

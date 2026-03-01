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

export enum StageIndex {
    FIRST = 0x01,
    SECOND = 0x02,
    THIRD = 0x03,
    FOURTH = 0x04,
    FIFTH = 0x05,
    SIXTH = 0x06
}

type StageArrayIndex = 0 | 1 | 2 | 3 | 4 | 5;

class DpiBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    private stages: [number, number, number, number, number, number] = [800, 1600, 2400, 3200, 5000, 12000];

    // noinspection FunctionTooLongJS
    constructor() {
        this.buffer = Buffer.alloc(56)

        this.buffer[0] = 0x04 // header
        this.buffer[1] = 0x38 // header
        this.buffer[2] = 0x01 // header

        this.buffer[3] = 0x00 // angle snap
        this.buffer[4] = 0x01 // ripple control

        this.buffer[5] = 0x3F // fixed

        this.buffer[6] = 0x20 // stage mask
        this.buffer[7] = 0x20 // stage mask

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
        this.buffer[24] = 0x02 // stage index
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
    }

    /**
     * Sets the angle snapping behavior for the object.
     *
     * @param {boolean} [active=false] - Determines whether angle snapping should be enabled.
     *                                   If `true`, angle snapping is activated; if `false`, it is disabled.
     * @return {this} The current instance for method chaining.
     */
    setAngleSnap(active = false): this {
        this.buffer[OFFSET.ANGLE_SNAP] = active ? 0x01 : 0x00;
        return this;
    }

    /**
     * Sets the rippler control state.
     *
     * @param {boolean} [active=true] - A boolean value indicating whether the rippler control is active or inactive. Defaults to `true`.
     * @return {this} The current instance for method chaining.
     */
    setRipplerControl(active = true): this {
        this.buffer[OFFSET.RIPPLER_CONTROL] = active ? 0x01 : 0x00;
        return this;
    }

    /**
     * Sets the current stage of the process.
     *
     * @param {StageIndex} stage - The stage index to set as the current stage.
     * @return {this} The instance of the current object for method chaining.
     */
    setCurrentStage(stage: StageIndex): this {
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
    setDpiValue(stage: StageIndex, dpi: number): this {
        const index = (stage - 1) as StageArrayIndex;

        this.stages[index] = dpi;
        this.buffer[OFFSET.STAGES_START + index] = this.encodeDpi(dpi);

        return this;
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

        for (let i = 0; i < 6; i++) {
            if (this.stages[i] as StageArrayIndex > 12000) {
                mask |= bitValues[i]!;
            }
        }

        this.buffer[OFFSET.STAGE_MASK_A] = mask;
        this.buffer[OFFSET.STAGE_MASK_B] = mask;
    }

    private updateHighStageFlags(): void {
        for (let i = 0; i < 6; i++) {
            this.buffer[OFFSET.EXPANDED_MASK + i] =
                this.stages[i] as StageArrayIndex > 10000 ? 0x01 : 0x00;
        }
    }


    calculateChecksum(): number {
        let sum = 0;

        for (let i = 3; i <= 49; i++) {
            sum += this.buffer[i]!;
        }

        return sum & 0xffff
    }

    build(mode: ConnectionMode): Buffer {
        this.updateStageMask();
        this.updateHighStageFlags();

        const checksum = this.calculateChecksum();

        this.buffer[OFFSET.CHECKSUM_HIGH_BYTE] = (checksum >> 8) & 0xff;
        this.buffer[OFFSET.CHECKSUM_LOW_BYTE] = checksum & 0xff;

        return mode === ConnectionMode.Wired
            ? this.buffer.subarray(0, OFFSET.CHECKSUM_LOW_BYTE + 1)
            : this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }

    compareWitHexString(value: string): boolean {
        return this.toString() == value
    }
}

export default DpiBuilder

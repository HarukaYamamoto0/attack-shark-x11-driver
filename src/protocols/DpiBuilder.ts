import {ConnectionMode, type ProtocolBuilder} from "../types.js";

const DPI_STEP_MAP: Record<number, number> = {
    50: 0x01,
    100: 0x02,
    150: 0x03,
    200: 0x04,
    250: 0x05,
    300: 0x06,
    350: 0x08,
    400: 0x09,
    450: 0x0a,
    500: 0x0b,
    550: 0x0c,
    600: 0x0e,
    650: 0x0f,
    700: 0x10,
    750: 0x11,
    800: 0x12,
    850: 0x13,
    900: 0x15,
    950: 0x16,
    1000: 0x17,
    1050: 0x18,
    1100: 0x19,
    1150: 0x1b,
    1200: 0x1c,
    1250: 0x1d,
    1300: 0x1e,
    1350: 0x1f,
    1400: 0x20,
    1450: 0x22,
    1500: 0x23,
    1550: 0x24,
    1600: 0x25,
    1650: 0x26,
    1700: 0x27,
    1750: 0x29,
    1800: 0x2a,
    1850: 0x2b,
    1900: 0x2c,
    1950: 0x2d,
    2000: 0x2f,
    2050: 0x30,
    2100: 0x31,
    2150: 0x32,
    2200: 0x33,
    2250: 0x34,
    2300: 0x36,
    2350: 0x37,
    2400: 0x38,
    2450: 0x39,
    2500: 0x3a,
    2550: 0x3b,
    2600: 0x3d,
    2650: 0x3e,
    2700: 0x3f,
    2750: 0x40,
    2800: 0x41,
    2850: 0x43,
    2900: 0x44,
    2950: 0x45,
    3000: 0x46,
    3050: 0x47,
    3100: 0x48,
    3150: 0x4a,
    3200: 0x4b,
    3250: 0x4c,
    3300: 0x4d,
    3350: 0x4e,
    3400: 0x4f,
    3450: 0x51,
    3500: 0x52,
    3550: 0x53,
    3600: 0x54,
    3650: 0x55,
    3700: 0x57,
    3750: 0x58,
    3800: 0x59,
    3850: 0x5a,
    3900: 0x5b,
    3950: 0x5c,
    4000: 0x5e,
    4050: 0x5f,
    4100: 0x60,
    4150: 0x61,
    4200: 0x62,
    4250: 0x63,
    4300: 0x65,
    4350: 0x66,
    4400: 0x67,
    4450: 0x68,
    4500: 0x69,
    4550: 0x6b,
    4600: 0x6c,
    4650: 0x6d,
    4700: 0x6e,
    4750: 0x6f,
    4800: 0x70,
    4850: 0x72,
    4900: 0x73,
    4950: 0x74,
    5000: 0x75,
    5050: 0x76,
    5100: 0x77,
    5150: 0x79,
    5200: 0x7a,
    5250: 0x7b,
    5300: 0x7c,
    5350: 0x7d,
    5400: 0x7f,
    5450: 0x80,
    5500: 0x81,
    5550: 0x82,
    5600: 0x83,
    5650: 0x84,
    5700: 0x86,
    5750: 0x87,
    5800: 0x88,
    5850: 0x89,
    5900: 0x8a,
    5950: 0x8b,
    6000: 0x8d,
    6050: 0x8e,
    6100: 0x8f,
    6150: 0x90,
    6200: 0x91,
    6250: 0x93,
    6300: 0x94,
    6350: 0x95,
    6400: 0x96,
    6450: 0x97,
    6500: 0x98,
    6550: 0x9a,
    6600: 0x9b,
    6650: 0x9c,
    6700: 0x9d,
    6750: 0x9e,
    6800: 0x9f,
    6850: 0xa1,
    6900: 0xa2,
    6950: 0xa3,
    7000: 0xa4,
    7050: 0xa5,
    7100: 0xa7,
    7150: 0xa8,
    7200: 0xa9,
    7250: 0xaa,
    7300: 0xab,
    7350: 0xac,
    7400: 0xae,
    7450: 0xaf,
    7500: 0xb0,
    7550: 0xb1,
    7600: 0xb2,
    7650: 0xb3,
    7700: 0xb5,
    7750: 0xb6,
    7800: 0xb7,
    7850: 0xb8,
    7900: 0xb9,
    7950: 0xbb,
    8000: 0xbc,
    8050: 0xbd,
    8100: 0xbe,
    8150: 0xbf,
    8200: 0xc0,
    8250: 0xc2,
    8300: 0xc3,
    8350: 0xc4,
    8400: 0xc5,
    8450: 0xc6,
    8500: 0xc7,
    8550: 0xc9,
    8600: 0xca,
    8650: 0xcb,
    8700: 0xcc,
    8750: 0xcd,
    8800: 0xcf,
    8850: 0xd0,
    8900: 0xd1,
    8950: 0xd2,
    9000: 0xd3,
    9050: 0xd4,
    9100: 0xd6,
    9150: 0xd7,
    9200: 0xd8,
    9250: 0xd9,
    9300: 0xda,
    9350: 0xdb,
    9400: 0xdd,
    9450: 0xde,
    9500: 0xdf,
    9550: 0xe0,
    9600: 0xe1,
    9650: 0xe3,
    9700: 0xe4,
    9750: 0xe5,
    9800: 0xe6,
    9850: 0xe7,
    9900: 0xe8,
    9950: 0xea,
    10000: 0xeb,
    10100: 0x76,
    10200: 0x77,
    10300: 0x79,
    10400: 0x7a,
    10500: 0x7b,
    10600: 0x7c,
    10700: 0x7d,
    10800: 0x7f,
    10900: 0x80,
    11000: 0x81,
    11100: 0x82,
    11200: 0x83,
    11300: 0x84,
    11400: 0x86,
    11500: 0x87,
    11600: 0x88,
    11700: 0x89,
    11800: 0x8a,
    11900: 0x8b,
    12000: 0x8d,
};

const OFFSET = {
    ANGLE_SNAP: 3,
    RIPPLER_CONTROL: 4,
    STAGE_MASK_A: 6,
    STAGE_MASK_B: 7,
    EXPANDED_MASK: 16,
    CURRENT_STAGE: 24,
    UNKNOWN: 50,
    CHECKSUM: 51,
    STAGE_OFFSET_BASE: 7,
    STAGES_START:      8,
    STAGES_END:        13,
} as const;

const CHECKSUM_RANGE = {START: 3, END: 49} as const;
const STAGE_COUNT = 6;
const HIGH_BYTE_THRESHOLD = 0x80;

export enum StageIndex {
    FIRST = 0x01,
    SECOND = 0x02,
    THIRD = 0x03,
    FOURTH = 0x04,
    FIFTH = 0x05,
    SIXTH = 0x06
}

export class DpiBuilder implements ProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    // noinspection FunctionTooLongJS
    constructor() {
        this.buffer = Buffer.alloc(56)

        this.buffer[0] = 0x04
        this.buffer[1] = 0x38
        this.buffer[2] = 0x01
        this.buffer[3] = 0x00 // angle snap
        this.buffer[4] = 0x01 // rippler control
        this.buffer[5] = 0x3F
        this.buffer[6] = 0x00
        this.buffer[7] = 0x00
        this.buffer[8] = 0x12 // stage 1 step
        this.buffer[9] = 0x25 // stage 2 step
        this.buffer[10] = 0x38 // stage 3 step
        this.buffer[11] = 0x4B // stage 4 step
        this.buffer[12] = 0x75 // stage 5 step
        this.buffer[13] = 0x8D // stage 6 step
        this.buffer[14] = 0x00
        this.buffer[15] = 0x00

        this.buffer[16] = 0x00
        this.buffer[17] = 0x00
        this.buffer[18] = 0x00
        this.buffer[19] = 0x00
        this.buffer[20] = 0x00
        this.buffer[21] = 0x01
        this.buffer[22] = 0x00
        this.buffer[23] = 0x00
        this.buffer[24] = 0x02 // stage index
        this.buffer[25] = 0xFF
        this.buffer[26] = 0x00
        this.buffer[27] = 0x00
        this.buffer[28] = 0x00
        this.buffer[29] = 0xFF
        this.buffer[30] = 0x00
        this.buffer[31] = 0x00

        this.buffer[32] = 0x00
        this.buffer[33] = 0xFF
        this.buffer[34] = 0xFF
        this.buffer[35] = 0xFF
        this.buffer[36] = 0x00
        this.buffer[37] = 0x00
        this.buffer[38] = 0xFF
        this.buffer[39] = 0xFF
        this.buffer[40] = 0xFF
        this.buffer[41] = 0x00
        this.buffer[42] = 0xFF
        this.buffer[43] = 0xFF
        this.buffer[44] = 0x40
        this.buffer[45] = 0x00
        this.buffer[46] = 0xFF
        this.buffer[47] = 0xFF

        this.buffer[48] = 0xFF
        this.buffer[49] = 0x02
        this.buffer[50] = 0x0F // unknown
        this.buffer[51] = 0x68 // checksum

        this.buffer[52] = 0x00 // padding
        this.buffer[53] = 0x00 // padding
        this.buffer[54] = 0x00 // padding
        this.buffer[55] = 0x00 // padding
    }

    setAngleSnap(active: boolean = false): this {
        this.buffer[OFFSET.ANGLE_SNAP] = active ? 0x01 : 0x00;
        return this;
    }

    setRipplerControl(active: boolean = true): this {
        this.buffer[OFFSET.RIPPLER_CONTROL] = active ? 0x01 : 0x00;
        return this;
    }

    setCurrentStage(currentStage: StageIndex): this {
        this.buffer[OFFSET.CURRENT_STAGE] = currentStage;
        return this;
    }

    setDpiValue(stage: StageIndex, dpi: number): this {
        this.buffer[OFFSET.STAGE_OFFSET_BASE + stage] = this.dpiToFirmwareStep(dpi);
        return this;
    }

    dpiToFirmwareStep(dpi: number): number {
        const STEP = 50;
        const MIN = 50;
        const MAX = 12000;

        const clamped = Math.min(Math.max(Math.ceil(dpi / STEP) * STEP, MIN), MAX);
        const value = DPI_STEP_MAP[clamped];

        if (value === undefined) throw new Error(`Unsupported DPI value: ${clamped}`);

        return value;
    }

    calculateChecksum(): number {
        let checksum = 0;
        for (let i = CHECKSUM_RANGE.START; i <= CHECKSUM_RANGE.END; i++) {
            checksum = (checksum + this.buffer[i]!) & 0xFF;
        }
        return checksum;
    }

    build(mode: ConnectionMode): Buffer {
        this.applyMask();
        this.buffer[OFFSET.CHECKSUM] = this.calculateChecksum();

        return mode === ConnectionMode.Wired
            ? this.buffer.subarray(0, OFFSET.CHECKSUM + 1) // exclui padding
            : this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }

    private applyMask(): void {
        const stages = this.buffer.subarray(OFFSET.STAGES_START, OFFSET.STAGES_END);

        let mask = 0;
        for (let i = 0; i < STAGE_COUNT; i++) {
            if (stages[i]! >= HIGH_BYTE_THRESHOLD) mask |= (1 << i);
        }

        this.buffer[OFFSET.STAGE_MASK_A] = mask;
        this.buffer[OFFSET.STAGE_MASK_B] = mask;

        for (let i = 0; i < STAGE_COUNT; i++) {
            this.buffer[OFFSET.EXPANDED_MASK + i] = (mask >> i) & 1;
        }
    }
}

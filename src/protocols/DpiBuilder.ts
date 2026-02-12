import type {ProtocolBuilder} from "../types.js";

export class DpiBuilder implements ProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    constructor() {
        this.buffer = Buffer.alloc(52, 0x00);
        // Fixed header
        this.buffer[0] = 0x04;
        this.buffer[1] = 0x38;
        this.buffer[2] = 0x01;
        // angle snap / ripple (kept off)
        this.buffer[3] = 0x00;
        this.buffer[4] = 0x00;
        this.buffer[5] = 0x3F;
        // Observed fixed trailer
        this.buffer[49] = 0x02;
        this.buffer[50] = 0x0F;
    }

    setStages(stages: [number, number, number, number, number, number], activeStage: number): this {
        if (activeStage < 1 || activeStage > 6) {
            throw new Error("Invalid active stage (1–6)");
        }

        // === DPI encoding ===
        for (let i = 0; i < 6; i++) {
            this.buffer[8 + i] = this.encodeDpi(stages[i]!);
        }

        // === High DPI bitmask ===
        const mask = this.buildHighDpiMask(stages);
        this.buffer[6] = mask;
        this.buffer[7] = mask;

        // === Individual flags per stage ===
        for (let i = 0; i < 6; i++) {
            this.buffer[21 + i] = stages[i]! >= 22000 ? 0x01 : 0x00;
        }

        // Current stage
        this.buffer[24] = activeStage;

        return this;
    }

    private encodeDpi(dpi: number): number {
        if (dpi >= 22000) return 0x81;
        if (dpi < 50) return 0x01;
        return Math.round(dpi / 50);
    }

    private buildHighDpiMask(dpis: number[]): number {
        let mask = 0;
        for (let i = 0; i < 6; i++) {
            const dpi = dpis[i];
            if (dpi !== undefined && dpi >= 22000) {
                mask |= (1 << i);
            }
        }
        return mask;
    }

    build(): Buffer {
        this.buffer[51] = this.calculateChecksum();
        return this.buffer;
    }

    calculateChecksum(): number {
        let checksum = 0;
        for (let i = 3; i <= 49; i++) {
            checksum = (checksum + this.buffer[i]!) & 0xFF;
        }
        return checksum;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }
}

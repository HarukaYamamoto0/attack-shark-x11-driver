import {ConnectionMode, type ProtocolBuilder} from "../types.js";

export enum Macro {
    Off = 0x00,
    Static = 0x10,
    Breathing = 0x20,
    Neon = 0x30,
    ColorBreathing = 0x40,
    StaticDpi = 0x50,
    BreathingDpi = 0x60
}

export class MacrosBuilder implements ProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0308;
    public readonly wIndex: number = 2;

    constructor() {
        this.buffer = Buffer.alloc(59);
        this.buffer[0] = 0x05; // header
        this.buffer[1] = 0x0f; // header
        this.buffer[2] = 0x01; // header
        this.buffer[3] = 0x00; // Default color mode (Off)
        this.buffer[4] = 0x03; // Default bucket (0) << 4 | default ledSpeed (3)
        this.buffer[5] = 0xa8; // Default deep sleep (10 min)
        this.buffer[6] = 0x00; // RGB: R
        this.buffer[7] = 0xff; // RGB: G
        this.buffer[8] = 0x00; // RGB: B
        this.buffer[9] = 0x01; // Default sleep (0.5 min)
        this.buffer[10] = 0x04; // Default key response (8ms)
        this.buffer[11] = 0x01;
        this.buffer[12] = 0xAF; // Initial checksum
    }

    calculateChecksum(): number {
        let checksum = 0;
        // Checksum is the sum of bytes from index 3 to 10
        for (let i = 3; i <= 10; i++) {
            checksum = (checksum + this.buffer[i]!) & 0xff;
        }
        return checksum;
    }

    build(mode: ConnectionMode): Buffer {
        this.buffer[12] = this.calculateChecksum();
        if (mode == ConnectionMode.Wired) return this.buffer.subarray(0, 13);
        else return this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }
}

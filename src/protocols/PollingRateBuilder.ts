import {ConnectionMode} from "../types.js";
import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";

export enum PollingRate {
    powerSaving = 125,
    office = 250,
    gaming = 500,
    eSports = 1000
}

/**
 * Builder for configuring the Polling Rate of the Attack Shark X11
 */
export class PollingRateBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer = Buffer.alloc(64);
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0306;
    public readonly wIndex: number = 2;

    constructor() {
        this.buffer = Buffer.alloc(9)
        this.buffer[0] = 0x06; // header
        this.buffer[1] = 0x09; // header
        this.buffer[2] = 0x01; // header
        this.buffer[3] = 0x01; // polling rate
        this.buffer[4] = 0xFE; // checksum
        this.buffer[5] = 0x00; // padding
        this.buffer[6] = 0x00; // padding
        this.buffer[7] = 0x00; // padding
        this.buffer[8] = 0x00; // padding
    }

    calculateChecksum(): number {
        return (0xFF - this.buffer[3]!); // The fifth byte is the complement of the fourth
    }

    /**
     * Creates an instance already configured for a specific rate
     */
    static forRate(rate: PollingRate): PollingRateBuilder {
        return new PollingRateBuilder().setPollingRate(rate);
    }

    /**
     * Sets the Polling Rate
     * @param rate Polling rate option
     */
    setPollingRate(rate: PollingRate): this {
        const rateMap: Record<PollingRate, number> = {
            [PollingRate.powerSaving]: 0x08,
            [PollingRate.office]: 0x04,
            [PollingRate.gaming]: 0x02,
            [PollingRate.eSports]: 0x01,
        };

        const value = rateMap[rate];
        if (value !== undefined) {
            this.buffer[3] = value;
        }

        return this;
    }

    build(_mode: ConnectionMode): Buffer {
        // In both connection modes, the buffer is the same.
        this.buffer[4] = this.calculateChecksum()
        return this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }

    compareWitHexString(value: string): boolean {
        return this.toString() == value
    }
}
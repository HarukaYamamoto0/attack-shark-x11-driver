import type {ProtocolBuilder} from "../types.js";

export enum PollingRateOptions {
    powerSaving = 125,
    office = 250,
    gaming = 500,
    eSports = 1000
}

/**
 * Builder for configuring the Polling Rate of the Attack Shark X11
 */
export class PollingRateBuilder implements ProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0306;
    public readonly wIndex: number = 2;

    constructor() {
        // Initializes with the command skeleton (9 bytes)
        // 06 09 01 ... 00 00 00 00
        this.buffer = Buffer.from("06090101fe00000000", "hex");
    }

    /**
     * Creates an instance already configured for a specific rate
     */
    static forRate(rate: PollingRateOptions): PollingRateBuilder {
        return new PollingRateBuilder().setPollingRate(rate);
    }

    /**
     * Sets the Polling Rate
     * @param rate Polling rate option
     */
    setPollingRate(rate: PollingRateOptions): this {
        const rateMap: Record<PollingRateOptions, number> = {
            [PollingRateOptions.powerSaving]: 0x08,
            [PollingRateOptions.office]: 0x04,
            [PollingRateOptions.gaming]: 0x02,
            [PollingRateOptions.eSports]: 0x01,
        };

        const value = rateMap[rate];
        if (value !== undefined) {
            this.buffer[3] = value;
            this.buffer[4] = 0xFF - value; // The fifth byte is the complement of the fourth
        }

        return this;
    }

    /**
     * Returns the final buffer to be sent to the device
     */
    build(): Buffer {
        return this.buffer;
    }

    /**
     * Hexadecimal representation of the buffer (for debugging)
     */
    toString(): string {
        return this.buffer.toString("hex");
    }
}
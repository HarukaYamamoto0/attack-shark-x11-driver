import { ConnectionMode, type ProtocolBuilder } from "../types.js";

/**
 * ⚠️ CRITICAL: INTERNAL STATE RESET REPORT
 *
 * From what I've been able to gather, although I'm not certain, this command resets the ACTIVE mouse configuration in RAM.
 *
 * It DOES NOT:
 *
 * - Clear the EEPROM
 * - Restore factory defaults
 * - Finalize any configuration
 *
 * It:
 *
 * - Clears the current configuration structure in memory
 * - Temporarily disables button mapping
 * - Leaves the device in a partially non-functional state
 *
 * After sending this report, ALL configuration blocks MUST be reapplied.
 *
 * If the complete sequence is not sent:
 *
 * → The mouse may stop responding correctly
 * → The buttons may stop working
 * → Only a physical shutdown and restart will restore the state
 *
 * This report should NEVER be exposed as a public API call.
 *
 * It should only be used internally, for example, when resetting all settings. Theoretically, you use it to clean up
 * before applying the new settings or when switching from one profile to another.
 *
 * DO NOT:
 *
 * - Send this report alone
 * - Send this report twice
 * - Send this report outside a complete configuration update
 */
export class InternalStateResetReportBuilder implements ProtocolBuilder {
    public readonly buffer: Buffer;
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x030C;
    public readonly wIndex: number = 2;

    constructor() {
        this.buffer = Buffer.alloc(10);

        // Report ID (must match low byte of wValue)
        this.buffer[0] = 0x0c;

        // Static payload observed in official software
        // Exact semantic meaning unknown, but behavior confirmed as RAM config reset
        this.buffer[1] = 0x0a;
        this.buffer[2] = 0x01;
        this.buffer[3] = 0xfe;
        this.buffer[4] = 0x01;
        this.buffer[5] = 0xfe;
        this.buffer[6] = 0x00;
        this.buffer[7] = 0x00;
        this.buffer[8] = 0x00;
        this.buffer[9] = 0x00;
    }

    calculateChecksum(): number {
        // No checksum required for this report
        return 0x00;
    }

    build(mode: ConnectionMode): Buffer {
        // Wired mode uses a truncated version (6 bytes observed)
        if (mode === ConnectionMode.Wired) {
            return this.buffer.subarray(0, 6);
        }

        return this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }
}
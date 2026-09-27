import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ConnectionMode } from '../types.js';

// TODO: This protocol is still under development; its logic has not yet been fully documented.
export class ChangeProfileBuilder implements BaseProtocolBuilder {
	readonly buffer: Buffer;

	constructor() {
		this.buffer = Buffer.from([
			0x0c, // Report ID
			0x0a, // length
			0x01, // profile ID
			0xfe, // profile ^ 0xff
			0x01, // vibration
			0xfe, // vibration ^ 0xff
			0x00, // padding
			0x00, // padding
			0x00, // padding
			0x00, // padding
		]);
	}

	calculateChecksum(): this {
		// No checksum required for this report
		return this;
	}

	build(mode: ConnectionMode): Buffer {
		// Wired mode uses a truncated version (6 bytes observed)
		if (mode === ConnectionMode.Wired) {
			return this.buffer.subarray(0, 6);
		}

		return this.buffer;
	}

	toHexString(): string {
		return this.buffer.toString('hex');
	}
}

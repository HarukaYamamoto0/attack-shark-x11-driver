import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ConnectionMode } from '../types.js';

// This protocol is still under development; its logic has not yet been fully documented.
export class ChangeProfileBuilder implements BaseProtocolBuilder {
	public static readonly BM_REQUEST_TYPE = 0x21;
	public static readonly B_REQUEST = 0x09;
	public static readonly W_VALUE = 0x030c;
	public static readonly W_INDEX = 2;

	readonly buffer: Buffer;
	public readonly bmRequestType: number = ChangeProfileBuilder.BM_REQUEST_TYPE;
	public readonly bRequest: number = ChangeProfileBuilder.B_REQUEST;
	public readonly wValue: number = ChangeProfileBuilder.W_VALUE;
	public readonly wIndex: number = ChangeProfileBuilder.W_INDEX;

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

	toString(): string {
		return this.buffer.toString('hex');
	}

	compareWithHexString(value: string): boolean {
		return this.toString() === value;
	}
}

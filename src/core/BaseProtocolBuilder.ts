import type { ConnectionMode } from '../types.js';

export interface BaseProtocolBuilder {
	// TODO: remove unnecessary properties from child classes
	buffer: Uint8Array;

	// Returns the final buffer to be sent to the device
	build(mode: ConnectionMode): Uint8Array | Uint8Array[];

	// Hexadecimal representation of the buffer (for debugging)
	toHexString(): string | string[];
}

import type { ConnectionMode } from '../types.js';

/**
 * Interface for constructing protocol buffers to communicate with a device.
 * Provides methods to build the buffer and get a hexadecimal representation
 * of the constructed data.
 */
export interface BaseProtocolBuilder {
	/**
	 * Builds a data structure based on the given connection mode.
	 *
	 * @param {ConnectionMode} mode - The connection mode that determines the structure and type of data to build.
	 * @return {Uint8Array | Uint8Array[]} The constructed data as a single Uint8Array or an array of Uint8Arrays.
	 */
	build(mode: ConnectionMode): Uint8Array | Uint8Array[];

	/**
	 * Converts the given input into its hexadecimal string representation.
	 *
	 * @return {string|string[]} The hexadecimal string representation of the input,
	 *                           or an array of hexadecimal strings if applicable.
	 */
	toHexString(): string | string[];
}

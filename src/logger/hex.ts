/**
 * Converts a number to its hexadecimal string representation prefixed with "0x".
 *
 * @param {number} value - The numeric value to be converted to a hexadecimal string.
 * @return {string} The hexadecimal string representation of the input number.
 */
export function hex(value: number): string {
	return `0x${value.toString(16)}`;
}

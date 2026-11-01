/**
 * Converts a number to its hexadecimal representation with optional padding.
 *
 * @param {number} value - The number to convert to hexadecimal.
 * @param {number} [padStart=2] - The minimum length of the resulting string, padded with leading zeros if necessary.
 * @return {string} The hexadecimal string representation of the number, prefixed with "0x".
 */
export function hex(value: number, padStart: number = 2): string {
	return `0x${value.toString(16).padStart(padStart, '0')}`;
}

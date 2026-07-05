/**
 * Logs the given number as a hexadecimal string in debug format.
 *
 * @param {number} value - The number to be converted to a hexadecimal string and logged.
 * @return {void} This function does not return a value.
 */
export function debugHex(value: number): void {
	console.log(`debugHex: 0x${value.toString(16).padStart(2, '0')}`);
}

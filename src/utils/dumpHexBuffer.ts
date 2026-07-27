/**
 * Prints a hexadecimal buffer grouped by a fixed number of bytes.
 * Useful for debugging binary protocols such as HID reports.
 *
 * @param hex - Hexadecimal string, with or without whitespace.
 * @param options - Formatting options.
 * @param options.groupSize - Number of bytes per group. Defaults to `3`.
 * @param options.label - Label used when printing each group. Defaults to `"Group"`.
 *
 * @example
 * dumpHexBuffer("083b0102000001000001");
 *
 * @example
 * dumpHexBuffer(reportHex, {
 *   groupSize: 3,
 *   label: "Slot",
 * });
 */
export function dumpHexBuffer(
	hex: string,
	options: {
		groupSize?: number;
		label?: string;
	} = {},
): void {
	const { groupSize = 3, label = 'Group' } = options;

	const normalized = hex.replace(/\s+/g, '');

	if (normalized.length % 2 !== 0) {
		throw new Error('Invalid hexadecimal string.');
	}

	const bytes = Uint8Array.from(normalized.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));

	for (let i = 0; i < bytes.length; i += groupSize) {
		const index = Math.floor(i / groupSize) + 1;

		const values = Array.from(bytes.slice(i, i + groupSize))
			.map((byte) => byte.toString(16).padStart(2, '0'))
			.join(' ');

		const offsets = Array.from({ length: Math.min(groupSize, bytes.length - i) }, (_, j) =>
			(i + j).toString().padStart(2, ' '),
		).join(', ');

		console.log(`${label} ${index.toString().padStart(2, '0')} [${offsets}] -> ${values}`);
	}
}

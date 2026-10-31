import { DPI_3311 } from '../tables/dpi-map.js';

/**
 * Converts bytes and flags back to a DPI value.
 *
 * @param xByte DPI X byte
 * @param yByte DPI Y byte
 * @param isDouble Double speed flag
 * @param _isTriple Triple speed flag (ignored for X11)
 * @returns Calculated DPI value
 */
export function convertBytesToDpi(xByte: number, yByte: number, isDouble: boolean, _isTriple: boolean): number {
	if (xByte === 0 && yByte === 0) return 0;

	let dpiValue: number;

	if (yByte === 0) {
		// Single byte mode, ≤ 10000 DPI, step 50
		const index = DPI_3311.indexOf(xByte);
		dpiValue = index !== -1 ? index * 50 + 50 : 50;
	} else if (yByte === 1) {
		// yByte is 1, step 100
		const index = DPI_3311.indexOf(xByte);
		dpiValue = index !== -1 ? index * 100 + 100 : 100;
	} else {
		// Double byte mode, > 10000 DPI
		const combinedIndex = (yByte << 8) | xByte;
		const baseIndex = 199;
		const extraIndex = combinedIndex - baseIndex;
		dpiValue = 10100 + extraIndex * 100;
	}

	// Multiplier handling (X11 only uses Double)
	if (isDouble) {
		if (xByte === 235) {
			// Special case 0xEB (235)
			return 20100;
		}
		dpiValue *= 2;
	}

	return Math.min(dpiValue, 26000);
}

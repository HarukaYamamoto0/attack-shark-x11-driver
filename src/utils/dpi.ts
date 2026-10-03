import { DPI_3311 } from '../tables/dpi-map.js';

export interface DpiBytes {
	xByte: number;
	yByte: number;
	isDouble: boolean;
	isTriple: boolean;
}

/**
 * Converts a DPI value to the corresponding bytes and flags for the PAW3311 sensor.
 *
 * @param dpi Desired DPI value (50 - 26000)
 * @returns Object containing X, Y bytes and multiplier flags
 */
export function convertDpiToBytes(dpi: number): DpiBytes {
	const clampedDpi = Math.max(50, Math.min(dpi, 26000));

	// Special cases based on original logic
	if (clampedDpi === 20100) {
		return { xByte: 0xeb, yByte: 1, isDouble: true, isTriple: false };
	}

	// Above 20000 the halved value goes in steps of 100, so the real steps are 200 (20200, 20400, ...). The vendor
	// software snaps anything in between to a neighbour, and so does this. Otherwise e.g. 20300 is written as 10300.
	const snappedDpi = clampedDpi > 20000 ? Math.round(clampedDpi / 200) * 200 : clampedDpi;

	let isDouble = false;
	const isTriple = false; // X11 doesn't seem to use triple speed for its standard range
	let targetDpi = snappedDpi;

	if (snappedDpi > 10000) {
		targetDpi = Math.round(snappedDpi / 2);
		isDouble = true;
	}

	// eslint-disable-next-line no-useless-assignment
	let xByte = 0;
	// eslint-disable-next-line no-useless-assignment
	let yByte = 0;

	// Halved values above 10000 (DPI above 20000) use the same step-100 table as below, with the doubled flag.
	// That's how the vendor software writes them (22000 -> 0x81, y = 1, doubled), and what the mouse reads back.
	if (targetDpi > 5000 && targetDpi % 100 === 0) {
		const index = Math.floor(targetDpi / 100) - 1;
		xByte = DPI_3311[index] ?? 0;
		yByte = 1;
	} else {
		const index = Math.floor((targetDpi - 50) / 50);
		xByte = DPI_3311[index] ?? 0;
		yByte = 0;
	}

	return { xByte, yByte, isDouble, isTriple };
}

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

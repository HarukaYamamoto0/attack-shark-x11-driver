import { type Option, PacketLength } from '../types';
import { DPI_3311, DpiBuilder, type StageIndex } from '../protocols/DpiBuilder';
import { DeviceId } from '../core/devices';
import type { RGB } from '../protocols/LightingSettingsBuilder';

export function handleResponseDpi(buffer: Uint8Array): Option<DpiBuilder> {
	console.log('Raw: ' + buffer.toHex());
	if (buffer.length !== 56)
		throw new Error(`Invalid dpi buffer size; expected ${PacketLength.DPI} but received ${buffer.length}`);

	const view = new DataView(buffer.buffer);
	// 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55
	// 04 38 01 00 01 3f 20 20 12 25 38 4b 75 81 00 00 00 00 00 00 00 01 00 00 02 ff 00 00 00 ff 00 00 00 ff ff ff 00 00 ff ff ff 00 ff ff 40 00 ff ff ff 02 0f 68 00 00 00 00
	// 04 38 00 01 3f 20 20 12 25 38 4b 75 81 00 00 00 00 00 00 00 01 00 00 02 ff 00 00 00 ff 00 00 00 ff ff ff 00 00 ff ff ff 00 ff ff 40 00 ff ff ff 02 0f 68 00 00 00 00 00

	// const reportId = view.getUint8(0); // Report ID
	// const reportLength = view.getUint8(1); // Report Length
	// const profileId = view.getUint8(2); // profile ID

	const angleSnap = view.getUint8(2); // angle snap
	const rippleControl = view.getUint8(3); // ripple control
	const activeStages = view.getUint8(4); // Stage Active; 3f == 0011 1111, each bit represents a stage going from right to left, used in the DPI Cycle button.

	const dpiXDoubleFlag = view.getUint8(5); // stage mask; 20 == 0010 0000, each bit represents a stage going from right to left, it tells you which stage is high. (>=0x8e)
	const dpiYDoubleFlag = view.getUint8(6); // duplicate from index 6

	const dpiXStage1 = view.getUint8(7);
	const dpiXStage2 = view.getUint8(8);
	const dpiXStage3 = view.getUint8(9);
	const dpiXStage4 = view.getUint8(10);
	const dpiXStage5 = view.getUint8(11);
	const dpiXStage6 = view.getUint8(12);
	const dpiXStage7 = view.getUint8(13);
	const dpiXStage8 = view.getUint8(14);

	const dpiYStage1 = view.getUint8(15);
	const dpiYStage2 = view.getUint8(16);
	const dpiYStage3 = view.getUint8(17);
	const dpiYStage4 = view.getUint8(18);
	const dpiYStage5 = view.getUint8(19);
	const dpiYStage6 = view.getUint8(20);
	const dpiYStage7 = view.getUint8(21);
	const dpiYStage8 = view.getUint8(22);

	const stageIndex = view.getUint8(23); // stage index

	const stage1color: RGB = {
		r: view.getUint8(24),
		g: view.getUint8(25),
		b: view.getUint8(26),
	};

	const stage2color: RGB = {
		r: view.getUint8(27),
		g: view.getUint8(28),
		b: view.getUint8(29),
	};

	const stage3color: RGB = {
		r: view.getUint8(30),
		g: view.getUint8(31),
		b: view.getUint8(32),
	};

	const stage4color: RGB = {
		r: view.getUint8(33),
		g: view.getUint8(34),
		b: view.getUint8(35),
	};

	const stage5color: RGB = {
		r: view.getUint8(36),
		g: view.getUint8(37),
		b: view.getUint8(38),
	};

	const stage6color: RGB = {
		r: view.getUint8(39),
		g: view.getUint8(40),
		b: view.getUint8(41),
	};

	const stage7color: RGB = {
		r: view.getUint8(42),
		g: view.getUint8(43),
		b: view.getUint8(44),
	};

	const stage8color: RGB = {
		r: view.getUint8(45),
		g: view.getUint8(46),
		b: view.getUint8(47),
	};

	const unkwnow = view.getUint8(48); // aaaaa aaaa

	const checksumH = view.getUint8(49); // checksum high byte
	const checksumL = view.getUint8(50); // checksum low byte

	const padding1 = view.getUint8(51); // padding wireless mode
	const padding2 = view.getUint8(52); // padding wireless mode
	const padding3 = view.getUint8(53); // padding wireless mode
	const padding4 = view.getUint8(54); // padding wireless mode

	const response = new DpiBuilder();

	const dpiXSettings = [
		dpiXStage1,
		dpiXStage2,
		dpiXStage3,
		dpiXStage4,
		dpiXStage5,
		dpiXStage6,
		dpiXStage7,
		dpiXStage8,
	];
	const dpiYSettings = [
		dpiYStage1,
		dpiYStage2,
		dpiYStage3,
		dpiYStage4,
		dpiYStage5,
		dpiYStage6,
		dpiYStage7,
		dpiYStage8,
	];

	const colors: RGB[] = [
		stage1color,
		stage2color,
		stage3color,
		stage4color,
		stage5color,
		stage6color,
		stage7color,
		stage8color,
	];

	for (let i = 0; i < 8; i++) {
		const xByte = dpiXSettings[i] ?? 0x00;
		const yByte = dpiYSettings[i] ?? 0x00;
		const isDoubleFlag = dpiXDoubleFlag & (1 << i);
		const isTripleFlag = dpiYDoubleFlag & (1 << i); // Add a "3x" indicator.

		const dpiValue = convertBytesToDpi3311(DeviceId.X11, xByte, yByte, isDoubleFlag, isTripleFlag);
		response.setDpiValue((i + 1) as StageIndex, dpiValue);
	}

	for (let i = 0; i < 8; i++) {
		response.setRGB((i + 1) as StageIndex, colors[i] ?? { r: 0, g: 0, b: 0 });
	}

	return new DpiBuilder();
}

function convertBytesToDpi3311(
	deviceId: DeviceId,
	xByte: number,
	yByte: number,
	isDoubleFlag: number,
	isTripleFlag: number,
): number {
	if (xByte === 0 && yByte === 0) {
		return 0;
	}
	console.log(
		'xByte',
		xByte.toString(16),
		'yByte',
		yByte.toString(16),
		'isDoubleFlag',
		isDoubleFlag.toString(16),
		'isTripleFlag',
		isTripleFlag.toString(16),
	);
	let dpiValue;

	if (yByte === 0) {
		// Single-byte mode, ≤10,000 DPI, step size 50
		const index = findDpi3311Index(xByte);
		if (index !== -1) {
			dpiValue = index * 50 + 50; // Range: 50–10,000; step size: 50
		} else {
			dpiValue = 50; // Default minimum value
		}
	} else if (yByte === 1) {
		// When yByte is 1, the step size is 100.
		const index = findDpi3311Index(xByte);

		if (index !== -1) {
			dpiValue = index * 100 + 100; // 步长100
		} else {
			dpiValue = 100; // Default minimum value
		}
		// console.log("Entered", index, dpiValue)
	} else {
		// Double-byte mode, >10,000 DPI
		const combinedIndex = (yByte << 8) | xByte;
		const baseIndex = 199; // The index corresponding to 10,000
		const extraIndex = combinedIndex - baseIndex;
		dpiValue = 10100 + extraIndex * 100; // Starting from 10,100, with a step size of 100.
	}
	// console.log("xByte", xByte, "yByte", yByte, "isDoubleFlag", isDoubleFlag, "isTripleFlag", isTripleFlag, "dpiValue", dpiValue)

	// Handling multiplier flags – Fix: Ensure the flag bit is correctly determined.
	// Define the list of devices that support tripling (adjust based on actual device models).
	const tripleSpeedSupportedDevices = [2, 14, 4, 36, 229, 234]; // Example device ID; please adjust, according to actual conditions.
	const supportsTripleSpeed = tripleSpeedSupportedDevices.includes(deviceId);

	if (isTripleFlag && isTripleFlag !== 0 && supportsTripleSpeed) {
		// Fix: Implemented special handling for differences between desktop and web versions.
		if (xByte === 0xc7) {
			// Desktop: xByte=196 corresponds to 24,900; Web: xByte=196 corresponds to 25,000.
			// Determine the value to return based on the current environment.
			return 25000; // Uniformly return 25,000.
		} else if (dpiValue >= 8000 && dpiValue <= 8500) {
			// Handling of the "Other" category in the 24,100–25,000 range (tripling the value)
			const baseValue = Math.floor((dpiValue - 8000) / 100) * 100 + 8000;
			dpiValue = (baseValue - 8000) * 3 + 24000;
		} else {
			dpiValue *= 3;
		}
	} else if (isDoubleFlag && isDoubleFlag !== 0) {
		dpiValue = dpiValue * 2;
	}

	return Math.min(dpiValue, 26000); // The maximum value is limited to 26,000.
}

// Added: Look up the index corresponding to the byte value in the DPI_3311 table.
function findDpi3311Index(byteValue: number): number {
	return DPI_3311.indexOf(byteValue);
}

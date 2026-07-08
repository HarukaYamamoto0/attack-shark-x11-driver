import { type Option, PacketLength } from '../types';
import { DpiBuilder, type LiftOffDistance, type StageIndex } from '../protocols/DpiBuilder';
import { convertBytesToDpi } from '../utils/dpi';
import type { RGB } from '../protocols/LightingSettingsBuilder';

export function handleResponseDpi(buffer: Uint8Array): Option<DpiBuilder> {
	console.log('Raw: ' + buffer.toHex());
	if (buffer.length !== 56)
		throw new Error(`Invalid dpi buffer size; expected ${PacketLength.DPI} but received ${buffer.length}`);

	const view = new DataView(buffer.buffer);
	const checksumByte = view.getUint16(50);

	let checksum = 0x00;
	for (let i = 3; i <= 49; i++) {
		checksum += view.getUint8(i);
	}

	if (checksum !== checksumByte)
		throw new Error(
			`Invalid dpi response checksum; expected: ${checksumByte.toString(16).padStart(4, '0')}, but calculated: ${checksum.toString(16).padStart(4, '0')}`,
		);

	// const reportId = view.getUint8(0);
	// const packetLength = view.getUint8(1);
	const profileId = view.getUint8(2);

	const liftOffDistanceAndAngleSnapByte = view.getUint8(3);
	const motionSyncAndRippleControl = view.getUint8(4);
	const bitmaskActiveStages = view.getUint8(5);

	const dpiXDoubleFlag = view.getUint8(6);
	const dpiYDoubleFlag = view.getUint8(7);

	const dpiXStage1 = view.getUint8(8);
	const dpiXStage2 = view.getUint8(9);
	const dpiXStage3 = view.getUint8(10);
	const dpiXStage4 = view.getUint8(11);
	const dpiXStage5 = view.getUint8(12);
	const dpiXStage6 = view.getUint8(13);
	const dpiXStage7 = view.getUint8(14);
	const dpiXStage8 = view.getUint8(15);

	const dpiYStage1 = view.getUint8(16);
	const dpiYStage2 = view.getUint8(17);
	const dpiYStage3 = view.getUint8(18);
	const dpiYStage4 = view.getUint8(19);
	const dpiYStage5 = view.getUint8(20);
	const dpiYStage6 = view.getUint8(21);
	const dpiYStage7 = view.getUint8(22);
	const dpiYStage8 = view.getUint8(23);

	const currentStageIndex = view.getUint8(24);

	const stage1color: RGB = {
		r: view.getUint8(25),
		g: view.getUint8(26),
		b: view.getUint8(27),
	};

	const stage2color: RGB = {
		r: view.getUint8(28),
		g: view.getUint8(29),
		b: view.getUint8(30),
	};

	const stage3color: RGB = {
		r: view.getUint8(31),
		g: view.getUint8(32),
		b: view.getUint8(33),
	};

	const stage4color: RGB = {
		r: view.getUint8(34),
		g: view.getUint8(35),
		b: view.getUint8(36),
	};

	const stage5color: RGB = {
		r: view.getUint8(37),
		g: view.getUint8(38),
		b: view.getUint8(39),
	};

	const stage6color: RGB = {
		r: view.getUint8(40),
		g: view.getUint8(41),
		b: view.getUint8(42),
	};

	const stage7color: RGB = {
		r: view.getUint8(43),
		g: view.getUint8(44),
		b: view.getUint8(45),
	};

	const stage8color: RGB = {
		r: view.getUint8(46),
		g: view.getUint8(47),
		b: view.getUint8(48),
	};

	// const dpiIndicationType = view.getUint8(49);

	// const padding1 = view.getUint8(50); // padding wireless mode
	// const padding2 = view.getUint8(51); // padding wireless mode
	// const padding3 = view.getUint8(52); // padding wireless mode
	// const padding4 = view.getUint8(53); // padding wireless mode

	const response = new DpiBuilder();
	response.setProfileId(profileId);

	const liftOffDistanceByte = (liftOffDistanceAndAngleSnapByte & 0xf0) >> 4;
	const angleSnapByte = liftOffDistanceAndAngleSnapByte & 0x0f;

	let liftOffDistance: LiftOffDistance;

	switch (liftOffDistanceByte) {
		case 0x00: {
			liftOffDistance = 0;
			break;
		}
		case 0x01: {
			liftOffDistance = 1;
			break;
		}
		case 0x02: {
			liftOffDistance = 2;
			break;
		}
		default: {
			liftOffDistance = 0;
		}
	}

	const angleSnap: boolean = angleSnapByte === 0x01;

	const motionSyncByte = (motionSyncAndRippleControl & 0xf0) >> 4;
	const rippleControlByte = motionSyncAndRippleControl & 0x0f;

	const motionSync = motionSyncByte === 0x01;
	const rippleControl = rippleControlByte === 0x01;

	response.setLiftOffDistance(liftOffDistance);
	response.setAngleSnap(angleSnap);
	response.setMotionSync(motionSync);
	response.setRippleControl(rippleControl);

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
		const isDoubleFlag = (dpiXDoubleFlag & (1 << i)) !== 0;
		const isTripleFlag = (dpiYDoubleFlag & (1 << i)) !== 0; // Check for multiplier flags

		const dpiValue = convertBytesToDpi(xByte, yByte, isDoubleFlag, isTripleFlag);
		console.log(`Stage ${i + 1}: ${dpiValue}`);
		response.setDpiValue((i + 1) as StageIndex, dpiValue);
	}

	for (let i = 0; i < 8; i++) {
		response.setRGB((i + 1) as StageIndex, colors[i] ?? { r: 0, g: 0, b: 0 });
	}

	response.setActiveStages(bitmaskActiveStages);
	response.setCurrentStage(currentStageIndex as StageIndex);

	return response;
}

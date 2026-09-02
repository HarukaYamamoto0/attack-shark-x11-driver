import { type BatteryInfo, BatteryStatus, type Option } from '../../types.js';

export function handleBatteryMessage(buffer: Uint8Array): Option<BatteryInfo> {
	const view = new DataView(buffer.buffer);

	if (view.byteLength !== 2) {
		throw new Error(
			`[handleBatteryMessage] - Invalid polling rate buffer size; expected 2 but received ${view.byteLength}`,
		);
	}

	const statusByte = view.getUint8(0);
	const percentage = view.getUint8(1);

	let batteryStatus: BatteryStatus;

	if (statusByte === BatteryStatus.NORMAL) batteryStatus = BatteryStatus.NORMAL;
	else if (statusByte === BatteryStatus.CHARGING_IN_PROGRESS) batteryStatus = BatteryStatus.CHARGING_IN_PROGRESS;
	else if (statusByte === BatteryStatus.FULLY_CHARGED) batteryStatus = BatteryStatus.FULLY_CHARGED;
	else throw new Error(`[handleBatteryMessage] - Invalid battery status byte: ${statusByte}`);

	return {
		status: batteryStatus,
		percentage,
	};
}

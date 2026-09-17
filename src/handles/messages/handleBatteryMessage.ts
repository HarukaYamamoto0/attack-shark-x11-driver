import { type BatteryInfo, BatteryStatus, type Option } from '../../types.js';

/**
 * Processes battery status and percentage data received as inputs and returns an object containing battery information.
 *
 * @param {number} params1 - Byte representing the status of the battery.
 * @param {number} params2 - Byte representing the battery's charge percentage.
 * @return {Option<BatteryInfo>} An object containing the battery status and charge percentage.
 * @throws {Error} If the status byte does not match any known battery status.
 */
export function handleBatteryMessage(params1: number, params2: number): Option<BatteryInfo> {
	const statusByte = params1;
	const percentageByte = params2;

	let batteryStatus: BatteryStatus;

	if (statusByte === BatteryStatus.NORMAL) batteryStatus = BatteryStatus.NORMAL;
	else if (statusByte === BatteryStatus.CHARGING_IN_PROGRESS) batteryStatus = BatteryStatus.CHARGING_IN_PROGRESS;
	else if (statusByte === BatteryStatus.FULLY_CHARGED) batteryStatus = BatteryStatus.FULLY_CHARGED;
	else throw new Error(`[handleBatteryMessage] - Invalid battery status byte: ${statusByte}`);

	return {
		status: batteryStatus,
		percentage: percentageByte,
	};
}

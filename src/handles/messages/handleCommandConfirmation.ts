import { CommandConfirmation, type Option, type ReportId } from '../../types.js';

/**
 * Processes command confirmation status data received from the device and returns an object containing confirmation info.
 *
 * @param {number} params1 - Byte representing the status of the command execution (0x00 = success, 0x01 = failed).
 * @param {number} params2 - Byte representing the Feature Report ID.
 * @return {Option<{ reportId: ReportId; status: CommandConfirmation }>} An object containing the reportId and success status.
 * @throws {Error} If the status byte does not match known command confirmation status values.
 */
export function handleCommandConfirmation(
	params1: number,
	params2: number,
): Option<{ reportId: ReportId; status: CommandConfirmation }> {
	if (params1 !== CommandConfirmation.Success && params1 !== CommandConfirmation.Failure) {
		throw new Error(`[handleCommandConfirmation] - Invalid command confirmation status byte: ${params1}`);
	}

	return {
		reportId: params2 as ReportId,
		status: params1 as CommandConfirmation.Success,
	};
}

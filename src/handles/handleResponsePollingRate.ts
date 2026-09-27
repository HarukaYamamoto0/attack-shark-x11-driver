import { Rate } from '../protocols/PollingRateBuilder';
import { ReportReadLength } from '../types';
import { ParamsError } from '../errors';

const hexToRate: Record<number, Rate> = {
	0x08: Rate.PowerSaving,
	0x04: Rate.Office,
	0x02: Rate.Gaming,
	0x01: Rate.ESports,
};

/**
 * Processes a buffer containing polling rate data and extracts the corresponding rate.
 *
 * @param {Uint8Array} buffer - The input buffer containing raw polling rate data.
 * @return {Rate} The polling rate extracted from the buffer. Throws an error if the buffer is invalid or the rate is not supported.
 */
export function handleResponsePollingRate(buffer: Uint8Array): Rate {
	if (buffer.length !== ReportReadLength.POLLING_RATE)
		throw new ParamsError(
			`Invalid polling rate buffer size; expected ${ReportReadLength.POLLING_RATE} but received ${buffer.length}`,
		);

	const dataView = new DataView(buffer.buffer);

	const rateByte = dataView.getUint8(3);

	const rate = hexToRate[rateByte];

	if (rate === undefined) throw new Error(`The read polling rate value is not supported; value read: ${rateByte}`);

	return rate;
}

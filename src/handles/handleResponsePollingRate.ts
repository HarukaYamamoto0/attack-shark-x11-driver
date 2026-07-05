import { hexToRate, type Rate } from '../protocols/PollingRateBuilder';
import { PacketLength, type Option } from '../types';

export function handleResponsePollingRate(buffer: Uint8Array): Option<Rate> {
	if (buffer.length !== 9)
		throw new Error(
			`Invalid polling rate buffer size; expected ${PacketLength.POLLING_RATE} but received ${buffer.length}`,
		);

	const dataView = new DataView(buffer.buffer);

	const rateByte = dataView.getUint8(2);

	const rate = hexToRate[rateByte];

	if (rate === undefined) throw new Error(`The read polling rate value is not supported; value read: ${rateByte}`);

	return rate;
}

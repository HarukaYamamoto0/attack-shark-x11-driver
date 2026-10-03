import { ReportReadLength } from '../types';
import { ParamsError } from '../errors';
import { ProfileSettingsBuilder } from '../protocols/ProfileSettingsBuilder';
import { hex } from '../logger/hex';

export function handleProfileSettings(buffer: Uint8Array): ProfileSettingsBuilder {
	if (buffer.length !== ReportReadLength.PROFILE_SETTING)
		throw new ParamsError(
			'buffer',
			`Invalid profile settings buffer size; expected ${ReportReadLength.PROFILE_SETTING} but received ${buffer.length}`,
		);

	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

	// const reportId = view.getUint8(0);
	// const packetLength = view.getUint8(1);
	const currentProfile = view.getUint8(2);
	const currentProfileChecksum = view.getUint8(3);
	const maxProfileCount = view.getUint8(4);
	const maxProfileCountChecksum = view.getUint8(5);

	const calculateCurrentProfileChecksum = ~currentProfile & 0xff;
	const calculateMaxProfileCountChecksum = ~maxProfileCount & 0xff;

	if (calculateCurrentProfileChecksum !== currentProfileChecksum)
		throw new ParamsError(
			'buffer',
			`invalid current profile checksum; expected ${hex(calculateCurrentProfileChecksum)} but received ${hex(currentProfileChecksum)}`,
		);
	if (calculateMaxProfileCountChecksum !== maxProfileCountChecksum)
		throw new ParamsError(
			'buffer',
			`invalid max profile count checksum; expected ${hex(calculateMaxProfileCountChecksum)} but received ${hex(maxProfileCountChecksum)}`,
		);

	return new ProfileSettingsBuilder()
		.setCurrentProfile(currentProfile)
		.setMaxProfileCount(maxProfileCount)
		.updateChecksum();
}

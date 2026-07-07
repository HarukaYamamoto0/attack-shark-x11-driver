import { AttackSharkX11, ConnectionMode, delay, PacketLength } from './src';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter });

try {
	await driver.open();

	const buffer = Buffer.alloc(PacketLength.DPI);
	buffer[0] = 0x04; // report id
	buffer[1] = 0x38; // length
	buffer[2] = 0x01; // profile id
	buffer[3] = 0x00; // angle snap
	buffer[4] = 0x01; // ripple control

	buffer[5] = 0x3f; // fixed

	buffer[6] = 0x3f; // stage mask
	buffer[7] = 0x3f; // stage mask

	buffer[8] = 0xc4; // stage 1 value
	buffer[9] = 0x25; // stage 2 value
	buffer[10] = 0x38; // stage 3 value
	buffer[11] = 0x4b; // stage 4 value
	buffer[12] = 0x75; // stage 5 value
	buffer[13] = 0x81; // stage 6 value
	buffer[14] = 0x00; // fixed
	buffer[15] = 0x00; // fixed

	buffer[16] = 0x01; // high stage 1
	buffer[17] = 0x00; // high stage 2
	buffer[18] = 0x00; // high stage 3
	buffer[19] = 0x00; // high stage 4
	buffer[20] = 0x00; // high stage 5
	buffer[21] = 0x01; // high stage 6
	buffer[22] = 0x00; // fixed
	buffer[23] = 0x00; // fixed

	buffer[24] = 0x01; // stage index

	buffer[25] = 0xff; // fixed
	buffer[26] = 0x00; // fixed
	buffer[27] = 0x00; // fixed
	buffer[28] = 0x00; // fixed
	buffer[29] = 0xff; // fixed
	buffer[30] = 0x00; // fixed
	buffer[31] = 0x00; // fixed
	buffer[32] = 0x00; // fixed
	buffer[33] = 0xff; // fixed
	buffer[34] = 0xff; // fixed
	buffer[35] = 0xff; // fixed
	buffer[36] = 0x00; // fixed
	buffer[37] = 0x00; // fixed
	buffer[38] = 0xff; // fixed
	buffer[39] = 0xff; // fixed
	buffer[40] = 0xff; // fixed
	buffer[41] = 0x00; // fixed
	buffer[42] = 0xff; // fixed
	buffer[43] = 0xff; // fixed
	buffer[44] = 0x40; // fixed
	buffer[45] = 0x00; // fixed
	buffer[46] = 0xff; // fixed
	buffer[47] = 0xff; // fixed
	buffer[48] = 0xff; // fixed
	buffer[49] = 0x02; // fixed
	buffer[50] = 0x0f; // checksum high byte
	buffer[51] = 0x68; // checksum low byte
	buffer[52] = 0x00; // padding wireless mode
	buffer[53] = 0x00; // padding wireless mode
	buffer[54] = 0x00; // padding wireless mode
	buffer[55] = 0x00; // padding wireless mode

	let sum = 0;

	for (let i = 3; i <= 49; i++) {
		sum += buffer[i] ?? 0x00;
	}

	console.log(sum.toString(16));

	buffer.writeUInt16BE(sum, 50);

	await delay(250)
	await driver.sendFeatureReport(buffer);
	await delay(250);

	const response = await driver.getDpi();

	if (!response) throw new Error('Failed to get dpi settings');

	console.log('Response: ' + response.toString());
} finally {
	await driver.close();
}

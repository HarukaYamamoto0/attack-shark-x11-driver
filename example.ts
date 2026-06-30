import { AttackSharkX11, ConnectionMode, delay, PacketLength, ReportId } from './src';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter });

const reportId = ReportId.DPI;
const payloadSize = PacketLength.DPI;

try {
	await driver.open();

	const statusCheckResponseStart = await driver.device.getFeatureReport(0xa0, 8); // status check
	console.log('Status Check Start Response: ' + statusCheckResponseStart.toHex());

	const headerResponse = await driver.controlTransfer(
		Buffer.from([0xa0, reportId, payloadSize, 0x01, 0x00, 0x00, 0x00, 0x00]),
	);
	console.log('Header Response: ' + headerResponse.toString(16).padStart(2, '0'));

	await delay(250);

	const statusCheckResponseMiddle = await driver.device.getFeatureReport(0xa0, 8); // status check
	console.log('Status Check Middle Response: ' + statusCheckResponseMiddle.toHex());

	const data = await driver.device.getFeatureReport(reportId, payloadSize);
	console.log('Data: ' + data.toHex());

	const statusCheckResponseEnd = await driver.device.getFeatureReport(0xa0, 8); // status check
	console.log('Status Check End Response: ' + statusCheckResponseEnd.toHex());

	// const dataView = new DataView(data.buffer);
	//
	// if (data.length !== payloadSize) throw new Error('Invalid data length');
	// // 0b 08 01 55 00 83 01 01
	//
	// const deviceId = dataView.getUint8(1);
	// const versionHigh = dataView.getUint8(4);
	// const versionLow = dataView.getUint8(5);
	// const version = (versionHigh << 8) | versionLow;
	//
	// console.log('Device ID: ' + deviceId.toString(16).padStart(0, '0'));
	// console.log('Version: ' + version.toString(16).padStart(0, '0'));
} finally {
	await driver.close();
}

import { AttackSharkX11, ConnectionMode } from './src';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter });

try {
	await driver.open();
	const response = await driver.getLightingSettings();

	if (!response) throw new Error('Failed to get lighting settings');

	console.log('Response: ' + response.toString());
} finally {
	await driver.close();
}

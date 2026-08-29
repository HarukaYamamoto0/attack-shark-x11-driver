import { AttackSharkX11, ConnectionMode, delay, Rate } from './src';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Wireless });

try {
	await driver.open();
	await delay(250);

	await driver.setPollingRate(Rate.eSports);
	await delay(250);

	const polling_rate = await driver.getPollingRate();
	console.log(`Polling rate: ${polling_rate}`);
} catch (error) {
	console.error('Error:', error instanceof Error ? error.message : error);
} finally {
	await driver.close();
	console.log('\nDriver closed.');
}

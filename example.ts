import { AttackSharkX11, CommandConfirmation, Rate } from './src';

const driver = new AttackSharkX11();

try {
	await driver.open();

	const commandConfirmation = await driver.setPollingRate(Rate.office);
	if (commandConfirmation === CommandConfirmation.Success) console.log('Command confirmed.');

	const response = await driver.getPollingRate();
	if (response) console.log('Current polling rate:', response);
} catch (error) {
	console.error('Error:', error);
} finally {
	await driver.close();
	console.log('\nDriver closed.');
}

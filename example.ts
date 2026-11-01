import { AttackSharkX11, Rate, CommandConfirmation } from './src';

try {
	// the class also implements the AsyncDisposable interface
	await using driver = new AttackSharkX11();
	await driver.open();

	const status = await driver.setPollingRate({ rate: Rate.Office });
	if (status !== CommandConfirmation.Success) throw new Error('The device rejected the command.');

	console.log('Current polling rate:', await driver.getPollingRate());
} catch (error) {
	console.error('Mouse communication failed:', error);
} finally {
	console.log('\nDriver closed.');
}

import { AttackSharkX11, ConnectionMode, MacrosBuilder } from './src/index.js';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter, delayMs: 500 });

try {
	await driver.open();

	const macroBuilder = new MacrosBuilder();
	await driver.setMacro(macroBuilder);
} catch (error) {
	console.error('An error occurred:', error);
} finally {
	await driver.close();
}

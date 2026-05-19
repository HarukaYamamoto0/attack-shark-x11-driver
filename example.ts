import {
	AttackSharkX11,
	Button,
	ConnectionMode,
	delay,
	logger,
	MacroName,
	MacrosBuilder,
	macroTemplates,
} from './src/index.js';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter, delayMs: 500 });

try {
	await driver.open();
	await driver.reset();
	await delay(250);

	const macroBuilder = new MacrosBuilder().setMacro(Button.BACKWARD, macroTemplates[MacroName.SHORTCUT_SWAP_WINDOW]);
	await driver.setMacro(macroBuilder);
} catch (error) {
	logger.error('An error occurred:', error);
} finally {
	await driver.close();
}

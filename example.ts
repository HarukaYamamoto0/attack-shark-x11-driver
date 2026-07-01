import {
	AttackSharkX11,
	Button,
	ConnectionMode,
	CustomMacroBuilder,
	delay,
	DpiBuilder,
	KeyCode,
	LightMode,
	logger,
	MacroMode,
	MacroName,
	MacrosBuilder,
	macroTemplates,
	PollingRateBuilder,
	Rate,
} from './src/index.js';

const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter, delayMs: 500 });

try {
	await driver.open();
	await delay(250);

	// await driver.reset();
	await delay(250);

	const macroBuilder = new MacrosBuilder().setMacro(Button.DPI, macroTemplates[MacroName.SHORTCUT_SWAP_WINDOW]);
	await driver.setMacro(macroBuilder);
	await delay(250);

	const dpiBuilder = new DpiBuilder({
		dpiValues: [800, 1600, 2400, 3400, 5000, 22000],
		activeStage: 2,
	});
	await driver.setDpi(dpiBuilder);
	await delay(250);

	const pollingRateBuilder = new PollingRateBuilder().setRate(Rate.eSports);
	await driver.setPollingRate(pollingRateBuilder);
	await delay(250);

	await driver.setUserPreferences({
		lightMode: LightMode.Neon,
		ledSpeed: 5,
		keyResponse: 4,
	});
	await delay(250);

	await driver.setCustomMacro(
		new CustomMacroBuilder()
			.setPlayOptions(MacroMode.THE_NUMBER_OF_TIME_TO_PLAY, 9)
			.setTargetButton(Button.BACKWARD, macroBuilder) // Here I pass the macroBuilder so as not to overwrite it
			.addEvent(KeyCode.A)
			.addEvent(KeyCode.A, 10, true),
	);
} catch (error) {
	logger.error('An error occurred:', error);
} finally {
	await driver.close();
}

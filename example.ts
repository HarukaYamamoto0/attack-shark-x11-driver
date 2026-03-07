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
	await driver.reset();

	const macroBuilder = new MacrosBuilder().setMacro(Button.DPI, macroTemplates[MacroName.SHORTCUT_SWAP_WINDOW]);
	await driver.setMacro(macroBuilder);

	const dpiBuilder = new DpiBuilder({
		dpiValues: [800, 1600, 2400, 3400, 5000, 22000],
		activeStage: 2,
	});
	await driver.setDpi(dpiBuilder);

	const pollingRateBuilder = new PollingRateBuilder().setRate(Rate.eSports);
	await driver.setPollingRate(pollingRateBuilder);

	await driver.setUserPreferences({
		lightMode: LightMode.Neon,
		ledSpeed: 5,
		keyResponse: 4,
	});
	await driver.setCustomMacro(
		new CustomMacroBuilder()
			.setPlayOptions(MacroMode.THE_NUMBER_OF_TIME_TO_PLAY, 9)
			.setTargetButton(Button.BACKWARD, macroBuilder) // Here I pass the macroBuilder so as not to overwrite it
			.addEvent(KeyCode.A)
			.addEvent(KeyCode.A, 10, true),
	);

	const batteryStatus = await driver.getBatteryLevel(1000);
	logger.info(`battery status: ${batteryStatus}%`);

	driver.on('batteryChange', (level: number) => {
		logger.info(`battery status in listening mode: ${level}%`);
	});

	await delay(10000); // Keep the system active for another 10 seconds to demonstrate the batteryChange event
} catch (error) {
	logger.error('An error occurred:', error);
} finally {
	await driver.close();
}

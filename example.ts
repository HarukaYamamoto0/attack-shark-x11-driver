import { AttackSharkX11, ConnectionMode, Rate, LightMode } from './src';

// Initialize the driver for the Attack Shark X11
// ConnectionMode.Adapter is for the 2.4GHz Wireless USB Dongle
// ConnectionMode.Wired is for the USB-C cable connection
const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter });

try {
	console.log('Connecting to Attack Shark X11...');
	await driver.open();
	console.log('Connected!');

	// 1. Get current DPI settings
	console.log('\n--- Current DPI Settings ---');
	const dpiSettings = await driver.getDpi();
	if (dpiSettings) {
		console.log(`Current Stage: ${dpiSettings.getCurrentStage()}`);
		console.log('DPI Values:', dpiSettings.getDpiValues());

		// Get info for a specific stage (Stage 1)
		const stage1Dpi = dpiSettings.getDpiValue(1);
		const stage1Color = dpiSettings.getRGB(1);
		console.log(`Stage 1: ${stage1Dpi} DPI, Color: RGB(${stage1Color.r}, ${stage1Color.g}, ${stage1Color.b})`);
	}

	// 2. Get current Polling Rate
	console.log('\n--- Current Polling Rate ---');
	const pollingRate = await driver.getPollingRate();
	console.log(`Polling Rate: ${pollingRate}Hz`);

	// 3. Get current Lighting Settings
	console.log('\n--- Current Lighting Settings ---');
	const lighting = await driver.getLightingSettings();
	if (lighting) {
		console.log(`Light Mode: ${lighting.getLightMode()}`);
		console.log(`Brightness: ${lighting.getBrightnessLevel()}`);
	}

	// 4. Update DPI Settings
	// You can update the current stage, all 8 DPI values, and their associated colors
	console.log('\nUpdating DPI Settings...');
	await driver.setDpi({
		currentStage: 2,
		dpiValues: [800, 1600, 2400, 3200, 5000, 10000, 15000, 22000],
		dpiColors: [
			{ r: 255, g: 0, b: 0 }, // Stage 1: Red
			{ r: 0, g: 255, b: 0 }, // Stage 2: Green
			{ r: 0, g: 0, b: 255 }, // Stage 3: Blue
			{ r: 255, g: 255, b: 0 }, // Stage 4: Yellow
			{ r: 0, g: 255, b: 255 }, // Stage 5: Cyan
			{ r: 255, g: 0, b: 255 }, // Stage 6: Magenta
			{ r: 255, g: 255, b: 255 }, // Stage 7: White
			{ r: 255, g: 128, b: 0 }, // Stage 8: Orange
		],
	});
	console.log('DPI Updated!');

	// 5. Update Polling Rate
	// Options: Rate.powerSaving (125Hz), Rate.office (250Hz), Rate.gaming (500Hz), Rate.eSports (1000Hz)
	console.log('\nUpdating Polling Rate to 1000Hz...');
	await driver.setPollingRate(Rate.eSports);
	console.log('Polling Rate Updated!');

	// 6. Update Lighting Settings
	console.log('\nUpdating Lighting Settings...');
	await driver.setLightingSettings({
		lightMode: LightMode.Neon,
		brightnessLevel: 3, // 0 to 4
		ledSpeed: 2, // 0 to 4
	});
	console.log('Lighting Updated!');

	// 7. Get Battery Level
	// Note: Battery level reading might not be available if the device is charging or in wired mode
	console.log('\nChecking Battery Level...');
	try {
		const battery = await driver.getBatteryLevel(2000); // 2 seconds timeout
		console.log(`Battery: ${battery}%`);
	} catch (err) {
		console.log('Could not get battery level (device might be busy, charging, or disconnected)');
	}
} catch (error) {
	console.error('Error:', error instanceof Error ? error.message : error);
} finally {
	await driver.close();
	console.log('\nDriver closed.');
}

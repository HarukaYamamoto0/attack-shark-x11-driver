import { AttackSharkX11, ConnectionMode, logger } from './src/index.js';

const driver = new AttackSharkX11({
	connectionMode: ConnectionMode.Adapter,
	delayMs: 500,
});

function parsePollingRate(raw: Buffer): string {
	const encoded = raw[3];
	const map: Record<number, string> = {
		0x08: '125 Hz',
		0x04: '250 Hz',
		0x02: '500 Hz',
		0x01: '1000 Hz',
	};
	// @ts-expect-error aaaaaaaaa
	return map[encoded] ?? `unknown (0x${encoded?.toString(16)})`;
}

function parseUserPreferences(raw: Buffer): object {
	const lightModeMap: Record<number, string> = {
		0x00: 'Off',
		0x10: 'Static',
		0x20: 'Breathing',
		0x30: 'Neon',
		0x40: 'Color Breathing',
		0x50: 'Static DPI',
		0x60: 'Breathing DPI',
	};

	const packed4 = raw[4] ?? 0;
	const packed5 = raw[5] ?? 0;

	const deepSleepHigh = (packed4 >> 4) & 0x0f;
	const ledSpeed = packed4 & 0x0f;
	const deepSleepLow = (packed5 >> 4) & 0x0f;
	const brightness = packed5 & 0x0f;
	const deepSleep = (deepSleepHigh << 4) | deepSleepLow;

	const debounceEncoded = raw[10] ?? 0;
	const debounceMs = (debounceEncoded - 2) * 2 + 4;

	const sleepEncoded = raw[9] ?? 0;
	const sleepMinutes = sleepEncoded / 2;

	return {
		lightMode: lightModeMap[raw[3] ?? 0] ?? `unknown (0x${(raw[3] ?? 0).toString(16)})`,
		deepSleepMin: deepSleep === 0xaa ? 'disabled' : `${deepSleep} min`,
		ledSpeed: 6 - ledSpeed, // inverted: encoded = 6 - userSpeed
		brightness,
		rgb: {
			r: raw[6],
			g: raw[7],
			b: raw[8],
		},
		sleepMin: sleepMinutes,
		debounceMs,
	};
}

try {
	await driver.open();

	console.log('─── Raw buffers ──────────────────────────────────');

	const rawDpi = await driver.getDpi();
	const rawPrefs = await driver.getUserPreferences();
	const rawRate = await driver.getPollingRate();
	const rawBtns = await driver.getButtons();

	console.log('DPI:      ', rawDpi.toString('hex'));
	console.log('Prefs:    ', rawPrefs.toString('hex'));
	console.log('Rate:     ', rawRate.toString('hex'));
	console.log('Buttons:  ', rawBtns.toString('hex'));

	console.log('\n─── Parsed ───────────────────────────────────────');

	console.log('Polling Rate:     ', parsePollingRate(rawRate));
	console.log('User Preferences: ', parseUserPreferences(rawPrefs));

	// DPI raw — decoder completo depende do DPI_STEP_MAP, mas dá pra ver os stages
	const dpiStages = [rawDpi[8], rawDpi[9], rawDpi[10], rawDpi[11], rawDpi[12], rawDpi[13]];
	console.log(
		'DPI stage bytes (encoded):',
		dpiStages.map((b) => `0x${b?.toString(16).padStart(2, '0')}`),
	);
	console.log('Active stage:', rawDpi[24]);
} catch (error) {
	logger.error('Error:', error);
} finally {
	await driver.close();
}

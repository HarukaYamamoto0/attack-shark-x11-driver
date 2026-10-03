// Hold the DPI button to switch profile. Run it from the repo folder:
//
//   bun scripts/hold-switch.ts setup 3          shows what it would change, changes nothing
//   bun scripts/hold-switch.ts setup 3 --yes    sets up 3 profiles (2 to 5) and makes the DPI button report its presses
//   bun scripts/hold-switch.ts run              hold the DPI button: next profile + 3 flashes. tap it: next DPI stage
//   bun scripts/hold-switch.ts undo 3 --yes     the DPI button changes the DPI by itself again
//
// setup gives every profile the DPI, lighting and polling rate of profile 1, and the default buttons. Use the 2.4G
// receiver, over the cable every other write stalls. "run" has to keep running: without it the DPI button does
// nothing (that's what "undo" is for).
import {
	AttackSharkX11,
	ButtonMapping,
	type DpiBuilder,
	FirmwareAction,
	type LightingSettingsBuilder,
	type Profile,
	type Rate,
	ReportId,
	ReportReadLength,
} from '../src';

const HOLD_BUTTON = ButtonMapping.Slot6; // the DPI button

interface Settings {
	dpi: DpiBuilder;
	lighting: LightingSettingsBuilder;
	pollingRate: Rate;
}

async function readProfile1(driver: AttackSharkX11): Promise<Settings> {
	return {
		dpi: await driver.getDpi(1),
		lighting: await driver.getLightingSettings(1),
		pollingRate: await driver.getPollingRate(1),
	};
}

/** Sets up `count` profiles with profile 1's DPI, lighting and polling rate. Everything is read before anything is written. */
export async function setup(driver: AttackSharkX11, count: number, reportsButton: boolean): Promise<void> {
	const settings = await readProfile1(driver);

	await driver.setupProfiles({
		...(reportsButton ? { holdButton: HOLD_BUTTON } : {}),
		profiles: Array.from({ length: count }, () => settings),
	});
}

/**
 * Switches to each profile in turn and checks whether a button there reports its presses, then goes back to
 * profile 1. Reading while the profile is active means it works whatever the mouse does with the profile number in
 * a read. Returns the profiles that don't match `reportsButton`.
 */
export async function check(driver: AttackSharkX11, count: number, reportsButton: boolean): Promise<number[]> {
	const wrong: number[] = [];
	for (let profile = 1; profile <= count; profile++) {
		await driver.switchProfile(profile as Profile);
		const table = await driver.getFeatureReport(ReportId.BUTTON_MAPPING, ReportReadLength.BUTTON_MAPPING, profile);
		const actions = Array.from({ length: 18 }, (_, slot) => table[3 + slot * 3]);
		if (actions.includes(FirmwareAction.REPORT_BUTTON) !== reportsButton) wrong.push(profile);
	}
	await driver.switchProfile(1 as Profile);

	return wrong;
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const [command = 'help', ...rest] = args.filter((a) => !a.startsWith('--'));
	const confirmed = args.includes('--yes');
	const count = Number(rest[0] ?? 2);

	if (!['setup', 'run', 'undo'].includes(command) || !Number.isInteger(count) || count < 2 || count > 5) {
		console.log('Usage: bun scripts/hold-switch.ts setup|undo [2-5] [--yes]   or   bun scripts/hold-switch.ts run');
		process.exit(command === 'help' ? 0 : 1);
	}

	const driver = new AttackSharkX11();
	try {
		await driver.open();

		if (command === 'setup' || command === 'undo') {
			const isSetup = command === 'setup';
			console.log(
				`This ${isSetup ? 'sets up' : 'resets'} profiles 1 to ${count}. Each one gets profile 1's DPI, lighting ` +
					`and polling rate, and the default buttons` +
					(isSetup
						? ', with the DPI button reporting its presses.'
						: ', so the DPI button works by itself again.'),
			);
			if (!confirmed) {
				console.log('Nothing changed yet. Run it again with --yes to do it.');
			} else {
				await setup(driver, count, isSetup);
				const wrong = await check(driver, count, isSetup);
				if (wrong.length > 0) {
					console.log(
						`Written, but profile ${wrong.join(', ')} didn't look right when checked afterwards. ` +
							'The mouse might be saving every write into the active profile. Profile 1 is active again.',
					);
					process.exitCode = 1;
				} else {
					console.log(
						isSetup
							? `All ${count} profiles checked. Now run: bun scripts/hold-switch.ts run`
							: `All ${count} profiles checked. The DPI button changes the DPI by itself again.`,
					);
				}
			}
		} else {
			const state = await driver.getProfileState();
			console.log(
				`Profile ${state.current} of ${state.count} is active. Hold the DPI button to switch, tap it to change ` +
					'the DPI. Ctrl+C to stop.',
			);
			if (state.count < 2) console.log('Only one profile is on. Run setup first.');

			let seen = false;
			driver.on('buttonEvent', (id, pressed) => {
				seen = true;
				console.log(`button ${id} ${pressed ? 'down' : 'up'}`);
			});
			const stop = driver.startHoldSwitch({
				onSwitch: (profile) => console.log(`switched to profile ${profile}`),
				onError: (error) => console.error(`error: ${error.message}`),
			});
			const hint = setTimeout(() => {
				if (!seen)
					console.log(
						'No button events yet. Press the DPI button, and run "setup 3 --yes" first if you haven\'t.',
					);
			}, 20000);

			await new Promise<void>((resolve) => process.once('SIGINT', () => resolve()));
			clearTimeout(hint);
			stop();
		}
	} catch (error) {
		console.error(`Stopped: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 1;
	} finally {
		await driver.close();
	}
}

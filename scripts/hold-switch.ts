// Hold the DPI button to switch profile. Run it from the repo folder with bun:
//
//   bun scripts/hold-switch.ts setup [profiles]          shows what it will change (2 to 5 profiles, 2 by default)
//   bun scripts/hold-switch.ts setup [profiles] --yes    sets up the profiles, the DPI button reports its presses
//   bun scripts/hold-switch.ts run                       hold the button: next profile + 3 flashes, press: next DPI stage
//   bun scripts/hold-switch.ts undo [profiles] --yes     the DPI button cycles the DPI by itself again
//
// "setup" copies the DPI, lighting and polling rate of profile 1 into every profile and resets their buttons to the
// default ones, with the DPI button reporting its presses. Use the 2.4G receiver: over the cable every other write
// stalls. "run" has to stay running, the DPI button does nothing without it (use "undo" to get it back).
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

/** Sets up `count` profiles, all with profile 1's DPI, lighting and polling rate. Reads everything before writing. */
export async function setup(driver: AttackSharkX11, count: number, reportsButton: boolean): Promise<void> {
	const settings = await readProfile1(driver);

	await driver.setupProfiles({
		...(reportsButton ? { holdButton: HOLD_BUTTON } : {}),
		profiles: Array.from({ length: count }, () => settings),
	});
}

/**
 * Goes to each profile in turn and checks whether a button there reports its presses, then goes back to profile 1.
 * The button table is read while that profile is the active one, so this works whatever the mouse does with the
 * profile number in a read. Returns the profiles that aren't the way `reportsButton` says they should be.
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
		console.log('usage: bun scripts/hold-switch.ts setup|undo [profiles 2-5] [--yes]   or   run');
		process.exit(command === 'help' ? 0 : 1);
	}

	const driver = new AttackSharkX11();
	try {
		await driver.open();

		if (command === 'setup' || command === 'undo') {
			const action = command === 'setup' ? 'sets up' : 'resets';
			console.log(
				`${command} ${action} profiles 1 to ${count}: they get the DPI, lighting and polling rate of profile 1, and\n` +
					`their buttons are set to the default ones${command === 'setup' ? ', with the DPI button reporting its presses' : ''}.`,
			);
			if (!confirmed) {
				console.log('nothing was changed. run it again with --yes to do it.');
			} else {
				await setup(driver, count, command === 'setup');
				const wrong = await check(driver, count, command === 'setup');
				if (wrong.length > 0) {
					console.log(
						`written, but profile ${wrong.join(', ')} didn't come out right when I went there and read it back.
` + `the mouse may be putting every write into the active profile. profile 1 is active again.`,
					);
					process.exitCode = 1;
				} else {
					console.log(
						command === 'setup'
							? `checked all ${count} profiles. now run: bun scripts/hold-switch.ts run`
							: `checked all ${count} profiles, the DPI button cycles the DPI by itself again.`,
					);
				}
			}
		} else {
			const state = await driver.getProfileState();
			console.log(`profile ${state.current} of ${state.count} is active. hold the DPI button, Ctrl+C to stop.`);
			if (state.count < 2) console.log('only one profile is enabled, run "setup" first.');

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
					console.log('no button events yet. press the DPI button, and run "setup --yes" if you haven\'t.');
			}, 20000);

			await new Promise<void>((resolve) => process.once('SIGINT', () => resolve()));
			clearTimeout(hint);
			stop();
		}
	} catch (error) {
		console.error('stopped:', error);
		process.exitCode = 1;
	} finally {
		await driver.close();
	}
}

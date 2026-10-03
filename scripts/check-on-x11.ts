// Checks the fixes from this branch on a real X11, and prints a report you can paste back.
//
//   bun scripts/check-on-x11.ts           only reads, changes nothing
//   bun scripts/check-on-x11.ts --write   also changes the lighting colour and DPI stage 8 for a moment,
//                                         then writes the exact old bytes back
//
// It never writes the button mapping, and the driver refuses report 0x10. The 2.4G receiver is best:
// over the cable every other write stalls.
import {
	AttackSharkX11,
	CommandConfirmation,
	ControlTransferError,
	handleProfileSettings,
	handleResponseDpi,
	handleResponseLightingSettings,
	handleResponsePollingRate,
	ReportId,
	ReportReadLength,
	type RGB,
	type StageIndex,
} from '../src';

type Say = (line: string) => void;

const hexBytes = (bytes: Uint8Array, from = 0, to = bytes.length): string =>
	[...bytes.subarray(from, to)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const sum = (bytes: Uint8Array, from: number, to: number): number =>
	bytes.subarray(from, to + 1).reduce((a, b) => a + b, 0);
const word = (bytes: Uint8Array, at: number): number => ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
const sameRgb = (a: RGB, b: RGB): boolean => a.r === b.r && a.g === b.g && a.b === b.b;

/** Over the cable every other write stalls, so try a few times like the vendor software does. */
async function retried<T>(what: () => Promise<T>): Promise<T> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await what();
		} catch (error) {
			if (!(error instanceof ControlTransferError) || attempt === 5) throw error;
			await Bun.sleep(200);
		}
	}
}

function read(driver: AttackSharkX11, id: ReportId, length: ReportReadLength, param = 0x01): Promise<Uint8Array> {
	return retried(() => driver.getFeatureReport(id, length, param));
}

async function readOnlyChecks(driver: AttackSharkX11, say: Say): Promise<void> {
	const polling = await read(driver, ReportId.POLLING_RATE, ReportReadLength.POLLING_RATE);
	say(`polling   ${hexBytes(polling)}  -> ${handleResponsePollingRate(polling)} Hz`);

	const profiles = await read(driver, ReportId.PROFILE_SETTING, ReportReadLength.PROFILE_SETTING, 0x00);
	const profile = handleProfileSettings(profiles);
	say(
		`profiles  ${hexBytes(profiles, 0, 6)}  -> current ${profile.getCurrentProfile()} of ${profile.getMaxProfileCount()}`,
	);

	const light = await read(driver, ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS);
	const lighting = handleResponseLightingSettings(light);
	say(
		`lighting  ${hexBytes(light, 0, 13)}  -> mode ${lighting.getLightMode()}, rgb ${JSON.stringify(lighting.rgb)}, ` +
			`checksum ${word(light, 11) === sum(light, 3, 10) ? 'ok' : 'WRONG'}`,
	);

	const dpi = await read(driver, ReportId.DPI, ReportReadLength.DPI);
	const dpis = handleResponseDpi(dpi);
	say(`dpi       stages ${dpis.getDpiValues().join(' ')}, mask ${hexBytes(dpi, 5, 6)}, flags ${hexBytes(dpi, 6, 8)}`);

	// The read order of the button table is the open question: the firmware dump says a write stores the
	// slots moved around and always puts the mode key (3c 00 00) at position 7, HolyJoey's untouched X11
	// read back in the written order. The raw bytes show which one this mouse does.
	const buttons = await read(driver, ReportId.BUTTON_MAPPING, ReportReadLength.BUTTON_MAPPING);
	const position = (n: number): string => hexBytes(buttons, 3 + (n - 1) * 3, 6 + (n - 1) * 3);
	say(`buttons   checksum ${word(buttons, 57) === sum(buttons, 3, 56) ? 'ok' : 'WRONG'}`);
	for (let n = 1; n <= 18; n += 6)
		say(
			`          ${[0, 1, 2, 3, 4, 5].map((i) => `${String(n + i).padStart(2)}: ${position(n + i)}`).join('  ')}`,
		);
	say(
		position(7) === '3c 00 00'
			? '          position 7 is the mode key (3c), which fits the firmware dump'
			: '          position 7 is not the mode key, which fits HolyJoey (no reordering)',
	);
}

async function lightingWriteCheck(driver: AttackSharkX11, say: Say): Promise<void> {
	const original = await read(driver, ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS);
	const before = handleResponseLightingSettings(original);
	const test: RGB = sameRgb(before.rgb, { r: 255, g: 0, b: 255 })
		? { r: 0, g: 255, b: 255 }
		: { r: 255, g: 0, b: 255 };
	try {
		const ack = await retried(() => driver.setLightingSettings(before.setRgb(test)));
		const after = handleResponseLightingSettings(
			await read(driver, ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS),
		);
		say(
			`lighting write: ack ${CommandConfirmation[ack]}, colour ${sameRgb(after.rgb, test) ? 'changed' : 'NOT changed'}, ` +
				`mode ${after.getLightMode() === before.getLightMode() ? 'kept' : 'CHANGED'}`,
		);
	} finally {
		await retried(() => driver.sendCommand(ReportId.LIGHTING_SETTINGS, original));
		const back = await read(driver, ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS);
		say(
			`lighting restore: ${hexBytes(back, 3, 13) === hexBytes(original, 3, 13) ? 'exact old bytes back' : 'DIFFERENT, check it'}`,
		);
	}
}

async function dpiWriteCheck(driver: AttackSharkX11, say: Say): Promise<void> {
	const original = await read(driver, ReportId.DPI, ReportReadLength.DPI);
	if ((original[5] ?? 0) & 0x80) {
		say('dpi write: skipped, stage 8 is in use on this mouse');
		return;
	}
	const stage: StageIndex = 8; // not in the active stages, so the mouse doesn't change speed
	try {
		const builder = handleResponseDpi(original).setDpiValue(stage, 22000);
		const ack = await retried(() => driver.setDpi(builder));
		const after = await read(driver, ReportId.DPI, ReportReadLength.DPI);
		const value = handleResponseDpi(after).getDpiValue(stage);
		say(
			`dpi write: ack ${CommandConfirmation[ack]}, stage 8 reads back ${value} (wanted 22000), ` +
				`flags ${hexBytes(after, 6, 8)} (wanted bit 7 in both)`,
		);
	} finally {
		await retried(() => driver.sendCommand(ReportId.DPI, original));
		const back = await read(driver, ReportId.DPI, ReportReadLength.DPI);
		say(
			`dpi restore: ${hexBytes(back, 3, 52) === hexBytes(original, 3, 52) ? 'exact old bytes back' : 'DIFFERENT, check it'}`,
		);
	}
}

export async function check(driver: AttackSharkX11, write: boolean, say: Say): Promise<void> {
	await readOnlyChecks(driver, say);
	if (!write) {
		say('(read only. run with --write to also test the lighting and DPI writes)');
		return;
	}
	await lightingWriteCheck(driver, say);
	await dpiWriteCheck(driver, say);
}

if (import.meta.main) {
	const driver = new AttackSharkX11();
	try {
		await driver.open();
		console.log('--- paste this into the PR ---');
		await check(driver, process.argv.includes('--write'), (line) => console.log(line));
		console.log('---');
	} catch (error) {
		console.error('stopped:', error);
		process.exitCode = 1;
	} finally {
		await driver.close();
	}
}

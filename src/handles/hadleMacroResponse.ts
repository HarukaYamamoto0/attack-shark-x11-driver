import { MacroBuilder } from '../protocols/MacroBuilder';
import { ConnectionMode, ReportReadLength } from '../types';
import type { RGB } from '../protocols/LightingSettingsBuilder';
import { decodeFixedUtf8 } from '../utils/decodeFixedUtf8';
import { EXTENDED_BYTE_FLAG, type MacroActionMouseCode } from '../structures/MacroAction';
import MacroAction, { MacroActionDirection } from '../structures/MacroAction';
import { keyboardKeypadPage, type KeyboardUsage } from '../core/keyboard-keypad-page';
import { ParamsError } from '../errors';
import { hex } from '../logger/hex';

export function handleMacroResponse(buffer: Uint8Array): MacroBuilder {
	if (buffer.length !== ReportReadLength.MACRO)
		throw new ParamsError(
			`Invalid macro buffer size; expected ${ReportReadLength.MACRO} but received ${buffer.length}`,
		);

	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
	const checksumByte = view.getUint16(129, true);

	let checksum = 0x00;
	for (let i = 3; i <= 128; i++) {
		checksum += view.getUint8(i);
	}

	if (checksum !== checksumByte)
		throw new ParamsError(
			`Invalid macro response checksum; expected: ${hex(checksumByte)}, ` + `but calculated: ${hex(checksum)}`,
		);

	// const reportId = view.getUint8(0); // not used
	// const packetLength = view.getUint8(1); // not used
	const macroId = view.getUint8(2);

	const macroType = view.getUint8(3);
	const macroGunRGB: RGB = {
		r: view.getUint8(4),
		g: view.getUint8(5),
		b: view.getUint8(6),
	};
	const loopTimes = view.getUint8(7);
	const macroName = buffer.subarray(8, 28);
	// const macroCount = view.getUint8(28); // not used

	// starting to read the actions
	const actionsBuffer = buffer.subarray(29, 129);
	const actionsBufferView = new DataView(actionsBuffer.buffer, actionsBuffer.byteOffset, actionsBuffer.byteLength);
	const actions: MacroAction[] = [];

	// a macro that fills all 100 bytes has no 00 00 end marker, so never read past the end
	for (let i = 0; i + 1 < actionsBuffer.length; i) {
		const delayAndAction: number = actionsBufferView.getUint8(i);
		const keyCode: number | MacroActionMouseCode = actionsBufferView.getUint8(i + 1);
		const hasExtendedBytes = i + 3 < actionsBuffer.length;
		const extendedDelay = hasExtendedBytes ? actionsBufferView.getUint8(i + 2) : 0x00;
		const extendedFlag = hasExtendedBytes ? actionsBufferView.getUint8(i + 3) : 0x00;

		if (delayAndAction === 0x00 && keyCode === 0x00) break; // end of macro

		let delay: number;
		let direction: MacroActionDirection;

		if (delayAndAction & MacroActionDirection.Release) {
			direction = MacroActionDirection.Release;
			delay = (delayAndAction & 0b01111111) * 10; // remove direction and convert to milliseconds
		} else if (delayAndAction & MacroActionDirection.Pressed) {
			direction = MacroActionDirection.Pressed;
			delay = (delayAndAction & 0b01111111) * 10; // remove direction and convert to milliseconds
		} else {
			// There is no flag bit; it might be a pure time value
			// I don't understand this case
			delay = delayAndAction * 10;
			direction = MacroActionDirection.Pressed; // Pressed by default
		}

		if (extendedFlag === EXTENDED_BYTE_FLAG) {
			delay += extendedDelay * 200; // Convert to milliseconds
			i += 2;
		}

		const button: KeyboardUsage | MacroActionMouseCode =
			keyboardKeypadPage[keyCode] ?? (keyCode as MacroActionMouseCode);

		actions.push(new MacroAction({ direction, button, delay }));

		i += 2;
	}

	const response = new MacroBuilder({
		id: macroId,
		loopTimes: loopTimes,
		actions: actions,
		name: decodeFixedUtf8(macroName).value,
		type: macroType,
		macroGunRGB: macroGunRGB,
	});

	response.build(ConnectionMode.Wireless); // force update fields

	return response;
}

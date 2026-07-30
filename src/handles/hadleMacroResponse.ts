import { MacroBuilder } from '../protocols/MacroBuilder';
import { type Option, PacketLengthRead } from '../types';

export function handleMacroResponse(buffer: Uint8Array): Option<MacroBuilder> {
	if (buffer.length !== PacketLengthRead.MACRO)
		throw new Error(`Invalid macro buffer size; expected ${PacketLengthRead.MACRO} but received ${buffer.length}`);

	// const dataView = new DataView(buffer.buffer);

	// See the Macro Builder class to understand how the writing is performed

	// default values for now, just to silence the linter
	return new MacroBuilder({
		macroId: 0x00,
		loopTimes: 0x00,
		macroActions: [],
		macroCodeNumber: 0x00,
		macroName: '0x00',
		macroType: 0x00,
		macroGunRGB: { r: 0x00, g: 0x00, b: 0x00 },
	});
}

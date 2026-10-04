import { ParamsError } from '../../errors';

export interface ButtonEvent {
	/** Which button, as the firmware numbers it: the position in its button table, counted from 1. */
	id: number;
	pressed: boolean;
}

/**
 * Parses the event a button set to FirmwareAction.REPORT_BUTTON sends: params1 is the button, params2 is 0x01 when
 * it's pressed and 0x00 when it's released.
 */
export function handleButtonEvent(params1: number, params2: number): ButtonEvent {
	if (params2 !== 0x00 && params2 !== 0x01)
		throw new ParamsError('params2', `Invalid button state byte: ${params2}, expected 0x00 or 0x01`);

	return { id: params1, pressed: params2 === 0x01 };
}

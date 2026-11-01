import { keyboardKeypadPage, type KeyboardUsage } from '../core/keyboard-keypad-page';
import { ParamsError } from '../errors';

/**
 * In this file, I'm leaving some hexadecimal values represented in binary
 * because they may look strange at first glance, but they make more sense
 * when viewed in their binary representation.
 */

export enum MacroActionDirection {
	Pressed = 0b00000000,
	Release = 0b10000000,
}

export const EXTENDED_BYTE_FLAG = 0x03;

/**
 * Enum representing mouse button codes for macro actions.
 *
 * This enumeration provides a set of predefined constants that map to specific
 * mouse button codes. These codes can be used as part of macro functionalities
 * where different mouse buttons are associated with particular actions.
 */
export enum MacroActionMouseCode {
	LEFT_BUTTON = 0xf1,
	RIGHT_BUTTON = 0xf2,
	MIDDLE_BUTTON = 0xf3,
	BACK_BUTTON = 0xf4,
	FORWARD_BUTTON = 0xf5,
}

class MacroAction {
	private _direction: MacroActionDirection = MacroActionDirection.Pressed;
	private _button: KeyboardUsage | MacroActionMouseCode =
		keyboardKeypadPage[0x04] ?? MacroActionMouseCode.LEFT_BUTTON;
	private _delayRaw: number = 10;
	public isExtended: boolean = false;

	private _buffer: Uint8Array = new Uint8Array(4);
	private _view: DataView = new DataView(this._buffer.buffer);

	constructor(options?: {
		direction: MacroActionDirection;
		button: KeyboardUsage | MacroActionMouseCode;
		delay: number;
	}) {
		this.setDirection(options?.direction ?? MacroActionDirection.Pressed);
		this.setButton(options?.button ?? keyboardKeypadPage[0x04] ?? MacroActionMouseCode.LEFT_BUTTON);
		this.setDelay(options?.delay ?? 10);
	}

	setDirection(direction: MacroActionDirection): this {
		this._direction = direction;

		const byte = this._view.getUint8(0);
		const delay = byte & 0b01111111; // Mask the delay bits

		this._view.setUint8(0, this._direction | delay);

		return this;
	}

	getDirection(): MacroActionDirection {
		const byte = this._view.getUint8(0);
		return byte & 0b10000000 ? MacroActionDirection.Release : MacroActionDirection.Pressed;
	}

	setButton(button: KeyboardUsage | MacroActionMouseCode): this {
		this._button = button;
		// the key byte is the same in both formats, so update it here too, not only in setDelay()
		this._view.setUint8(1, this.buttonToUint8());
		return this;
	}

	getButton(): KeyboardUsage | MacroActionMouseCode {
		return this._button;
	}

	/**
	 * Sets the delay duration in milliseconds.
	 * Validates the input and applies necessary transformations for internal usage.
	 *
	 * @param {number} delayMs - The delay duration in milliseconds. Must be between 10 and 50000.
	 * @return {this} Returns the instance for method chaining.
	 * @throws {RangeError} Throws if `delayMs` is not within the allowed range (10 to 50000).
	 * @throws {ParamsError} Throws if the calculated delay is too large to handle internally.
	 */
	setDelay(delayMs: number): this {
		if (delayMs < 10 || delayMs > 50000) {
			throw new RangeError('Invalid delayMs value; expected between 10 and 50000, but received ' + delayMs);
		}

		this._delayRaw = Math.floor(delayMs / 10) * 10;

		const delayUnits = this._delayRaw / 10;

		if (delayUnits > 0x7f) {
			this.isExtended = true;

			const blocks = Math.floor(this._delayRaw / 200);

			if (blocks > 0xff) {
				throw new ParamsError('delayMs', `Delay too large: ${this._delayRaw} ms`);
			}

			const remainderMs = this._delayRaw % 200;
			const remainderUnits = remainderMs / 10;

			this._view.setUint8(0, this._direction | remainderUnits);

			this._view.setUint8(1, this.buttonToUint8());
			this._view.setUint8(2, blocks);
			this._view.setUint8(3, EXTENDED_BYTE_FLAG);
		} else {
			this.isExtended = false;

			this._view.setUint8(0, this._direction | delayUnits);

			this._view.setUint8(1, this.buttonToUint8());
		}

		return this;
	}

	private buttonToUint8(): number {
		if (typeof this._button === 'number') {
			return this._button;
		} else {
			return keyboardKeypadPage[this._button.keyCode]?.keyCode ?? 0;
		}
	}

	getDelay(): number {
		return this._delayRaw;
	}

	toBuffer(): Uint8Array {
		return this.isExtended ? this._buffer : this._buffer.subarray(0, 2);
	}
}

export default MacroAction;

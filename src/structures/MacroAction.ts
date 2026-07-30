import { keyboardKeypadPage, type KeyboardUsage } from '../core/keyboard-keypad-page';

export enum MacroActionDirection {
	Pressed = 0x0,
	Release = 0x80,
}

export enum MacroMouseCode {
	LEFT_BUTTON = 0xf1,
	RIGHT_BUTTON = 0xf2,
	MIDDLE_BUTTON = 0xf3,
	BACK_BUTTON = 0xf4,
	FORWARD_BUTTON = 0xf5,
}

class MacroAction {
	private _action: MacroActionDirection = MacroActionDirection.Pressed;
	private _button: KeyboardUsage | MacroMouseCode = keyboardKeypadPage[0x04] ?? MacroMouseCode.LEFT_BUTTON;
	private _delay: number = 10;
	public isExtended: boolean = false;

	private _buffer: Uint8Array = new Uint8Array(4);
	private _view: DataView = new DataView(this._buffer.buffer);

	constructor(action: MacroActionDirection, button: KeyboardUsage, delay: number) {
		this.setAction(action);
		this.setButton(button);
		this.setDelay(delay);
	}

	setAction(action: MacroActionDirection): this {
		this._action = action;

		this._view.setUint8(0, this._action === MacroActionDirection.Release ? 0x00 : 0x01);

		return this;
	}

	getAction(): MacroActionDirection {
		return this._action;
	}

	setButton(button: KeyboardUsage | MacroMouseCode): this {
		this._button = button;
		return this;
	}

	getButton(): KeyboardUsage | MacroMouseCode {
		return this._button;
	}

	setDelay(delay: number): this {
		if (delay < 10) throw new Error(`Invalid delay value; expected 10 or greater, but received ${delay}`);
		this._delay = delay;

		if (delay > 1270) {
			this.isExtended = true;

			let encodedTime = delay;

			const tmp = encodedTime / 200;
			const temp1 = encodedTime % 200;

			encodedTime = temp1 / 10;

			if (this._action === MacroActionDirection.Release) {
				encodedTime |= 0x81;
			}

			this._view.setUint8(0, encodedTime);
			this._view.setUint8(1, this.buttonToUint8());
			this._view.setUint8(2, tmp);
			this._view.setUint8(3, 0x03);
		} else {
			let encodedTime = Math.floor(delay / 10);

			if (this._action === MacroActionDirection.Release) {
				encodedTime |= 0x80;
			}

			this._view.setUint8(0, encodedTime);
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
		return this._delay;
	}

	toUint8Array(): Uint8Array {
		return this.isExtended ? this._buffer.subarray(0, 2) : this._buffer;
	}
}

export default MacroAction;

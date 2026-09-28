import type { FirmwareAction } from '../core/keyboard-keypad-page';
import { keyboardKeypadPage, type KeyboardUsage, type Modifiers } from '../core/keyboard-keypad-page';

export class SlotButton {
	constructor(
		public firmwareAction: FirmwareAction,
		public modifiers: Modifiers | number = 0x00,
		public usageId: KeyboardUsage | number = 0x00,
	) {}

	getFirmwareAction(): FirmwareAction {
		return this.firmwareAction as FirmwareAction;
	}

	getModifiers(): Modifiers | number {
		if (typeof this.modifiers === 'number') return this.modifiers;
		return this.modifiers as Modifiers;
	}

	getKeyboardUsage(): KeyboardUsage | number {
		if (typeof this.usageId !== 'number' && 'keycode' in this.usageId) {
			const usageId = keyboardKeypadPage[this.usageId.keyCode];

			if (!usageId) {
				if (keyboardKeypadPage[0]) return keyboardKeypadPage[0];
				throw new Error(`Invalid key code: ${this.usageId}`);
			}
		}

		return this.usageId as number;
	}

	toString(): string {
		return `firmwareAction: ${this.firmwareAction.toString(16)}, modifiers: ${this.modifiers.toString(16)}, usageId: ${
			typeof this.usageId === 'number' ? this.usageId.toString(16) : this.usageId.keyCode.toString(16)
		}`;
	}
}

import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { type ConnectionMode, PacketLength, type ProfileId } from '../types.js';
import { FirmwareAction, keyboardKeypadPage, type KeyboardUsage, type Modifiers } from '../core/keyboard-keypad-page';

export enum ButtonMapping {
	Slot1 = 1, // left
	Slot2 = 2, // right
	Slot3 = 3, // middle
	Slot4 = 4,
	Slot5 = 5, // read-only
	Slot6 = 6, // dpi cycle
	Slot7 = 7, // forward
	Slot8 = 8, // backward
	Slot9 = 9,
	Slot10 = 10,
	Slot11 = 11,
	Slot12 = 12,
	Slot13 = 13,
	Slot14 = 14,
	Slot15 = 15,
	Slot16 = 16,
	Slot17 = 17, // scroll up
	Slot18 = 18, // scroll down
}

export const buttonMappingToOffset: Record<ButtonMapping, number> = {
	[ButtonMapping.Slot1]: 3,
	[ButtonMapping.Slot2]: 6,
	[ButtonMapping.Slot3]: 9,
	[ButtonMapping.Slot4]: 12,
	[ButtonMapping.Slot5]: 15,
	[ButtonMapping.Slot6]: 18,
	[ButtonMapping.Slot7]: 21,
	[ButtonMapping.Slot8]: 24,
	[ButtonMapping.Slot9]: 27,
	[ButtonMapping.Slot10]: 30,
	[ButtonMapping.Slot11]: 33,
	[ButtonMapping.Slot12]: 36,
	[ButtonMapping.Slot13]: 39,
	[ButtonMapping.Slot14]: 42,
	[ButtonMapping.Slot15]: 45,
	[ButtonMapping.Slot16]: 48,
	[ButtonMapping.Slot17]: 51,
	[ButtonMapping.Slot18]: 54,
};

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

export interface ButtonMappingBuilderOptions {
	profileId: ProfileId;
	slot1?: SlotButton;
	slot2?: SlotButton;
	slot3?: SlotButton;
	slot4?: SlotButton;
	slot5?: SlotButton;
	slot6?: SlotButton;
	slot7?: SlotButton;
	slot8?: SlotButton;
	slot9?: SlotButton;
	slot10?: SlotButton;
	slot11?: SlotButton;
	slot12?: SlotButton;
	slot13?: SlotButton;
	slot14?: SlotButton;
	slot15?: SlotButton;
	slot16?: SlotButton;
	slot17?: SlotButton;
	slot18?: SlotButton;
}

export const buttonMappingBuilderDefaultOptions: ButtonMappingBuilderOptions = {
	profileId: 0x01,
	slot1: new SlotButton(FirmwareAction.LEFT_CLICK, 0x00, 0x00),
	slot2: new SlotButton(FirmwareAction.RIGHT_CLICK, 0x00, 0x00),
	slot3: new SlotButton(FirmwareAction.MIDDLE_CLICK, 0x00, 0x00),
	slot4: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot5: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot6: new SlotButton(FirmwareAction.GLOBAL_DPI_CYCLE, 0x00, 0x00),
	slot7: new SlotButton(FirmwareAction.FORWARD, 0x00, 0x00),
	slot8: new SlotButton(FirmwareAction.BACKWARD, 0x00, 0x00),
	slot9: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot10: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot11: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot12: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot13: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot14: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot15: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot16: new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	slot17: new SlotButton(FirmwareAction.SCROLL_UP, 0x00, 0x00),
	slot18: new SlotButton(FirmwareAction.SCROLL_DOWN, 0x00, 0x00),
};

/**
 * Builder for configuring macros and mouse button reassignments.
 * Allows mapping buttons to mouse clicks, keyboard keys, multimedia controls, etc.
 */
export class ButtonMappingBuilder implements BaseProtocolBuilder {
	public static readonly BM_REQUEST_TYPE = 0x21;
	public static readonly B_REQUEST = 0x09;
	public static readonly W_VALUE = 0x0308;
	public static readonly W_INDEX = 2;

	public readonly bmRequestType: number = ButtonMappingBuilder.BM_REQUEST_TYPE;
	public readonly bRequest: number = ButtonMappingBuilder.B_REQUEST;
	public readonly wValue: number = ButtonMappingBuilder.W_VALUE;
	public readonly wIndex: number = ButtonMappingBuilder.W_INDEX;

	public buffer = Buffer.alloc(PacketLength.BUTTON_MAPPING);
	public view = new DataView(this.buffer.buffer);

	private profileId: ProfileId = buttonMappingBuilderDefaultOptions.profileId;

	constructor(options?: ButtonMappingBuilderOptions) {
		this.buffer[0] = 0x08; // report ID
		this.buffer[1] = 0x3b; // packet length
		this.buffer[2] = 0x01; // profile ID

		// Initialize all 18 button slots (3 bytes each) with [0x01, 0x00, 0x00]
		// This is the "Inactive" or "Disabled" default state for most slots.
		for (let i = 3; i <= 54; i += 3) {
			this.buffer[i] = 0x01;
			this.buffer[i + 1] = 0x00;
			this.buffer[i + 2] = 0x00;
		}

		// Default internal assignments
		this.buffer[18] = 0x0d; // Slot 6 (DPI Cycle)
		this.buffer[51] = 0x09; // Slot 17 (Scroll Up)
		this.buffer[54] = 0x0a; // Slot 18 (Scroll Down)

		const config = { ...buttonMappingBuilderDefaultOptions, ...options };

		if (config.slot1 !== undefined) this.setButton(ButtonMapping.Slot1, config.slot1);
		if (config.slot2 !== undefined) this.setButton(ButtonMapping.Slot2, config.slot2);
		if (config.slot3 !== undefined) this.setButton(ButtonMapping.Slot3, config.slot3);
		if (config.slot4 !== undefined) this.setButton(ButtonMapping.Slot4, config.slot4);
		if (config.slot5 !== undefined) this.setButton(ButtonMapping.Slot5, config.slot5);
		if (config.slot6 !== undefined) this.setButton(ButtonMapping.Slot6, config.slot6);
		if (config.slot7 !== undefined) this.setButton(ButtonMapping.Slot7, config.slot7);
		if (config.slot8 !== undefined) this.setButton(ButtonMapping.Slot8, config.slot8);
		if (config.slot9 !== undefined) this.setButton(ButtonMapping.Slot9, config.slot9);
		if (config.slot10 !== undefined) this.setButton(ButtonMapping.Slot10, config.slot10);
		if (config.slot11 !== undefined) this.setButton(ButtonMapping.Slot11, config.slot11);
		if (config.slot12 !== undefined) this.setButton(ButtonMapping.Slot12, config.slot12);
		if (config.slot13 !== undefined) this.setButton(ButtonMapping.Slot13, config.slot13);
		if (config.slot14 !== undefined) this.setButton(ButtonMapping.Slot14, config.slot14);
		if (config.slot15 !== undefined) this.setButton(ButtonMapping.Slot15, config.slot15);
		if (config.slot16 !== undefined) this.setButton(ButtonMapping.Slot16, config.slot16);
		if (config.slot17 !== undefined) this.setButton(ButtonMapping.Slot17, config.slot17);
		if (config.slot18 !== undefined) this.setButton(ButtonMapping.Slot18, config.slot18);
	}

	public setProfileId(id: ProfileId): this {
		this.profileId = id;

		this.view.setInt8(2, id);

		return this;
	}

	public getProfileId(): ProfileId {
		return this.profileId;
	}

	setButton(button: ButtonMapping, slot: SlotButton): this {
		const offset = buttonMappingToOffset[button];

		if (!offset) throw new ParamsError('button', 'Invalid button');

		this.setSlot(offset, slot.getFirmwareAction(), slot.getModifiers(), slot.getKeyboardUsage());

		return this;
	}

	getButton(button: ButtonMapping): SlotButton {
		const offset = buttonMappingToOffset[button];

		if (!offset) throw new ParamsError('button', 'Invalid button');

		const firmwareActionByte = this.view.getUint8(offset);
		const modifiersByte = this.view.getUint8(offset + 1);
		const usageIdByte = this.view.getUint8(offset + 2);

		const tryGetUsageId = keyboardKeypadPage[usageIdByte] ?? usageIdByte;

		return new SlotButton(firmwareActionByte, modifiersByte, tryGetUsageId);
	}

	// internal, no use!!
	public setSlot(
		offset: number,
		firmwareAction: FirmwareAction,
		modifiers: Modifiers | number = 0x00,
		usageId: KeyboardUsage | number = 0x00,
	): void {
		this.view.setInt8(offset, firmwareAction);
		this.view.setInt8(offset + 1, modifiers);

		if (typeof usageId === 'number') {
			this.view.setInt8(offset + 2, usageId);
		} else {
			this.view.setInt8(offset + 2, usageId.keyCode);
		}
	}

	calculateChecksum(): this {
		let sum = 0;

		for (let i = 2; i < this.buffer.length - 1; i++) {
			sum = (sum + (this.buffer[i] ?? 0x00)) & 0xff;
		}

		this.buffer[58] = (sum - 1) & 0xff;
		return this;
	}

	build(_mode: ConnectionMode): Buffer {
		this.calculateChecksum();
		return this.buffer;
	}

	toString(): string {
		return this.buffer.toString('hex');
	}

	compareWithHexString(value: string): boolean {
		return this.toString() === value;
	}
}

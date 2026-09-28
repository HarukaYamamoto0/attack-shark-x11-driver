import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { type ConnectionMode, type ProfileId, ReportId, ReportPacketLength } from '../types.js';
import { FirmwareAction, keyboardKeypadPage, type KeyboardUsage, type Modifiers } from '../core/keyboard-keypad-page';
import { repeat } from '../utils/repeat';
import { SlotButton } from '../structures/SlotButton';

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

export const defaultSlots: [
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
	SlotButton,
] = [
	new SlotButton(FirmwareAction.LEFT_CLICK, 0x00, 0x00),
	new SlotButton(FirmwareAction.RIGHT_CLICK, 0x00, 0x00),
	new SlotButton(FirmwareAction.MIDDLE_CLICK, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.GLOBAL_DPI_CYCLE, 0x00, 0x00),
	new SlotButton(FirmwareAction.FORWARD, 0x00, 0x00),
	new SlotButton(FirmwareAction.BACKWARD, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00),
	new SlotButton(FirmwareAction.SCROLL_UP, 0x00, 0x00),
	new SlotButton(FirmwareAction.SCROLL_DOWN, 0x00, 0x00),
];

/**
 * @see ./docs/protocols/button-mapping.md
 */
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

/**
 * A class responsible for building button mapping configurations for devices. This builder constructs
 * a byte buffer that contains configurations for various button slots, profile IDs, and other related
 * data for device communication.
 *
 * Implements the `BaseProtocolBuilder` interface for building and generating device-compatible payloads.
 */
export class ButtonMappingBuilder implements BaseProtocolBuilder {
	private _buffer = new Uint8Array(ReportPacketLength.BUTTON_MAPPING).fill(0x00);
	private _view = new DataView(this._buffer.buffer, this._buffer.byteOffset, this._buffer.byteLength);

	private _profileId: ProfileId = 0x01;
	private _slots = defaultSlots;

	constructor(options?: ButtonMappingBuilderOptions) {
		// set headers
		this._view.setInt8(0, ReportId.BUTTON_MAPPING);
		this._view.setInt8(1, ReportPacketLength.BUTTON_MAPPING);
		this._view.setInt8(2, this._profileId);

		this.setProfileId(options?.profileId ?? this._profileId);
		this.setButton(ButtonMapping.Slot1, options?.slot1 ?? this._slots[0]);
		this.setButton(ButtonMapping.Slot2, options?.slot2 ?? this._slots[1]);
		this.setButton(ButtonMapping.Slot3, options?.slot3 ?? this._slots[2]);
		this.setButton(ButtonMapping.Slot4, options?.slot4 ?? this._slots[3]);
		this.setButton(ButtonMapping.Slot5, options?.slot5 ?? this._slots[4]);
		this.setButton(ButtonMapping.Slot6, options?.slot6 ?? this._slots[5]);
		this.setButton(ButtonMapping.Slot7, options?.slot7 ?? this._slots[6]);
		this.setButton(ButtonMapping.Slot8, options?.slot8 ?? this._slots[7]);
		this.setButton(ButtonMapping.Slot9, options?.slot9 ?? this._slots[8]);
		this.setButton(ButtonMapping.Slot10, options?.slot10 ?? this._slots[9]);
		this.setButton(ButtonMapping.Slot11, options?.slot11 ?? this._slots[10]);
		this.setButton(ButtonMapping.Slot12, options?.slot12 ?? this._slots[11]);
		this.setButton(ButtonMapping.Slot13, options?.slot13 ?? this._slots[12]);
		this.setButton(ButtonMapping.Slot14, options?.slot14 ?? this._slots[13]);
		this.setButton(ButtonMapping.Slot15, options?.slot15 ?? this._slots[14]);
		this.setButton(ButtonMapping.Slot16, options?.slot16 ?? this._slots[15]);
		this.setButton(ButtonMapping.Slot17, options?.slot17 ?? this._slots[16]);
		this.setButton(ButtonMapping.Slot18, options?.slot18 ?? this._slots[17]);
	}

	public setProfileId(id: ProfileId): this {
		this._profileId = id;
		this._view.setInt8(2, id);

		return this;
	}

	public getProfileId(): ProfileId {
		this._profileId = this._view.getInt8(2);

		return this._profileId;
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

		const firmwareActionByte = this._view.getUint8(offset);
		const modifiersByte = this._view.getUint8(offset + 1);
		const usageIdByte = this._view.getUint8(offset + 2);

		const tryGetUsageId = keyboardKeypadPage[usageIdByte] ?? usageIdByte;

		return new SlotButton(firmwareActionByte, modifiersByte, tryGetUsageId);
	}

	private setSlot(
		offset: number,
		firmwareAction: FirmwareAction,
		modifiers: Modifiers | number = 0x00,
		usageId: KeyboardUsage | number = 0x00,
	): void {
		this._view.setInt8(offset, firmwareAction);
		this._view.setInt8(offset + 1, modifiers);

		if (typeof usageId === 'number') {
			this._view.setInt8(offset + 2, usageId);
		} else {
			this._view.setInt8(offset + 2, usageId.keyCode);
		}
	}

	updateChecksum(): this {
		let checksum = 0x00;

		repeat(56, (i) => {
			checksum += this._view.getUint8(3 + i);
		});

		this._view.setInt8(58, checksum & 0xff);

		return this;
	}

	build(_mode: ConnectionMode): Uint8Array {
		this.updateChecksum();
		return this._buffer;
	}

	toHexString(): string {
		return this._buffer.toHex();
	}
}

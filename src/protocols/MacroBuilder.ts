import type MacroAction from '../structures/MacroAction';
import type { RGB } from './LightingSettingsBuilder';
import { type ConnectionMode, PacketLength, ReportId } from '../types';
import { encodeFixedUtf8 } from '../utils/encodeUtf8Fixed';
import { decodeFixedUtf8 } from '../utils/decodeFixedUtf8';
import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder';

interface Macro {
	macroId: number;
	macroType: MacroType;
	macroGunRGB: RGB;
	loopTimes?: number;
	macroName: string;
	macroCodeNumber: number;
	macroActions: MacroAction[];
}

enum MacroPages {
	First = 0,
	Second = 1,
	Third = 2,
}

enum MacroType {
	FIXED_LOOP = 0x00, // Uses loopTimes
	UNTIL_KEY_PRESS = 0x01, // Runs until any key interrupts it
	WHILE_PRESSED = 0x02, // Executes while the button remains pressed.
}

export class MacroBuilder implements BaseProtocolBuilder {
	// private mainBuffer: Uint8Array = new Uint8Array(192);
	// private mainView: DataView = new DataView(this.mainBuffer.buffer);

	private firstPacket: Uint8Array = new Uint8Array(64);
	private firstPacketView: DataView = new DataView(this.firstPacket.buffer);

	private secondPacket: Uint8Array = new Uint8Array(64);
	private secondPacketView: DataView = new DataView(this.secondPacket.buffer);

	private thirdPacket: Uint8Array = new Uint8Array(64);
	private thirdPacketView: DataView = new DataView(this.thirdPacket.buffer);

	private actions: Uint8Array = new Uint8Array(92);
	private actionsView: DataView = new DataView(this.actions.buffer);

	public _macroId: number = 0x00;
	public _macroType: MacroType = MacroType.FIXED_LOOP;
	public _macroGunRGB: RGB = { r: 0x00, g: 0x00, b: 0x00 };
	public _loopTimes: number = 0;
	public _macroName: string = 'macro1';
	private _macroCodeNumber: number = 0;
	private _macroActions: MacroAction[] = [];

	constructor(options: Macro) {
		this.firstPacket.fill(0x00);
		this.secondPacket.fill(0x00);
		this.thirdPacket.fill(0x00);

		this.firstPacketView.setUint8(0, ReportId.MACRO);
		this.firstPacketView.setUint8(1, PacketLength.MACRO);
		this.firstPacketView.setUint8(2, options.macroId);
		this.firstPacketView.setUint8(3, MacroPages.First);
		this.firstPacketView.setUint8(4, options.macroType);
		this.firstPacketView.setUint8(5, options.macroGunRGB.r);
		this.firstPacketView.setUint8(6, options.macroGunRGB.g);
		this.firstPacketView.setUint8(7, options.macroGunRGB.b);
		this.firstPacketView.setUint8(8, options?.loopTimes ?? 0x00);

		const macroNameBytes = encodeFixedUtf8(options.macroName, 20);

		for (let offset = 9; offset <= 28; offset++) {
			this.firstPacketView.setUint8(offset, macroNameBytes.bytes[offset] ?? 0x61); // letter a
		}

		this.firstPacketView.setUint8(29, options.macroActions.length);

		// set headers
		this.secondPacketView.setUint8(0, ReportId.MACRO);
		this.secondPacketView.setUint8(1, PacketLength.MACRO);
		this.secondPacketView.setUint8(2, options.macroId);
		this.secondPacketView.setUint8(3, MacroPages.Second);

		// set headers
		this.thirdPacketView.setUint8(0, ReportId.MACRO);
		this.thirdPacketView.setUint8(1, PacketLength.MACRO);
		this.thirdPacketView.setUint8(2, options.macroId);
		this.thirdPacketView.setUint8(3, MacroPages.Third);
	}

	setId(id: number): this {
		if (id < 0x00 || id > 0xff) throw new Error(`Invalid macro id; expected 0x00 to 0xff, but received ${id}`);
		this._macroId = id;

		this.firstPacketView.setUint8(2, id);

		return this;
	}

	getId(): number {
		const id = this.firstPacketView.getUint8(2);
		this._macroId = id;
		return id;
	}

	setType(type: MacroType): this {
		this._macroType = type;
		this.firstPacketView.setUint8(4, type);
		return this;
	}

	getType(): MacroType {
		const type = this.firstPacketView.getUint8(4);
		this._macroType = type;
		return type;
	}

	setMacroGunRGB(color: RGB): this {
		this._macroGunRGB = color;
		this.firstPacketView.setUint8(5, color.r);
		this.firstPacketView.setUint8(6, color.g);
		this.firstPacketView.setUint8(7, color.b);
		return this;
	}

	getMacroGunRGB(): RGB {
		const r = this.firstPacketView.getUint8(5);
		const g = this.firstPacketView.getUint8(6);
		const b = this.firstPacketView.getUint8(7);

		this._macroGunRGB = { r, g, b };
		return { r, g, b };
	}

	setLoopTimes(amount: number): this {
		this._loopTimes = amount;
		this.firstPacketView.setUint8(8, amount);
		return this;
	}

	getLoopTimes(): number {
		const amount = this.firstPacketView.getUint8(8);
		this._loopTimes = amount;
		return amount;
	}

	setName(name: string): this {
		const macroNameBytes = encodeFixedUtf8(name, 20);

		this._macroName = decodeFixedUtf8(macroNameBytes.bytes).value;

		for (let offset = 9; offset <= 28; offset++) {
			this.firstPacketView.setUint8(offset, macroNameBytes.bytes[offset] ?? 0x61); // letter a
		}
		return this;
	}

	getName(): string {
		const macroNameBytes = new Uint8Array(20);
		const view = new DataView(macroNameBytes.buffer);

		for (let offset = 0; offset <= 19; offset++) {
			view.setUint8(offset, this.firstPacketView.getUint8(offset + 10));
		}

		return decodeFixedUtf8(macroNameBytes).value;
	}

	updateActionCount(): this {
		this._macroCodeNumber = this._macroActions.length;

		this.firstPacketView.setUint8(29, this._macroCodeNumber);

		return this;
	}

	getActionCount(): number {
		const actionCount = this.firstPacketView.getUint8(29);
		this._macroCodeNumber = actionCount;
		return actionCount;
	}

	setAction(action: MacroAction): this {
		if (this._macroCodeNumber + (action.isExtended ? 2 : 1) > 46) {
			throw new Error('Max actions reached; cannot add more actions to the macro.');
		}

		this._macroCodeNumber = this._macroCodeNumber + (action.isExtended ? 2 : 1);

		this._macroActions.push(action);
		this.actionsView.setUint8(this._macroCodeNumber, action.getAction());

		return this;
	}

	// @ts-expect-error :) I don't really feel like correcting this, sorry.
	public build(_mode: ConnectionMode): [Uint8Array, Uint8Array, Uint8Array] {
		// clear
		this._macroCodeNumber = 0;
		this.actions.fill(0x00);

		let offset = 0;

		for (let index = 0; index < this._macroActions.length; index++) {
			const action = this._macroActions[index];

			// just to silence the linter
			if (!action) {
				this._macroCodeNumber = this._macroCodeNumber - 1;
				continue;
			}

			const actionBuffer = action.toUint8Array();
			const view = new DataView(actionBuffer.buffer);

			this.actionsView.setUint8(offset, view.getUint8(0));
			this.actionsView.setUint8(offset++, view.getUint8(1));

			this._macroCodeNumber = this._macroCodeNumber + (action.isExtended ? 2 : 1);
			offset += 2;

			if (action.isExtended) {
				this.actionsView.setUint8(offset++, view.getUint8(2));
				this.actionsView.setUint8(offset++, view.getUint8(3));
				offset += 2;
			}
		}

		this.firstPacketView.setUint8(29, this._macroCodeNumber);

		// 09400800000000000100000000000000000000000000000000000000002e01048104010481040104810401048104010481040104810401048104010481040104 = 34
		// 09400801810401048104010481040104810401048104010481040104810401048104010481040104810401048104010481040104810401048104010481040000 = 58
		// 090c08020000000000000c9500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000 = 00
		// There's still some space here... maybe I could add more actions, but I don't have time to run tests anymore...

		this.firstPacket.set(this.actions.subarray(0, 34), 30);
		this.secondPacket.set(this.actions.subarray(35, 58), 4);

		let checksum = 0;

		for (let i = 8; i < this.firstPacket.length; i++) {
			checksum += this.firstPacketView.getUint8(i);
		}

		for (let i = 4; i < this.secondPacket.length; i++) {
			checksum += this.secondPacketView.getUint8(i);
		}

		this.thirdPacketView.setUint8(10, (checksum & 0xff00) >> 8);
		this.thirdPacketView.setUint8(11, checksum & 0xff);

		return [this.firstPacket, this.secondPacket, this.thirdPacket];
	}
}

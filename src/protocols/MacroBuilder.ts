// noinspection JSUnusedGlobalSymbols

import type MacroAction from '../structures/MacroAction';
import type { RGB } from './LightingSettingsBuilder';
import { type ConnectionMode, ReportPacketLength, ReportId } from '../types';
import { encodeFixedUtf8 } from '../utils/encodeUtf8Fixed';
import { decodeFixedUtf8 } from '../utils/decodeFixedUtf8';
import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder';
import { ParamsError } from '../errors';

export interface MacroBuilderOptions {
	id: number;
	type: MacroType;
	macroGunRGB: RGB;
	loopTimes: number;
	name?: string;
	actions?: MacroAction[];
}

export enum MacroPages {
	First = 0x00,
	Second = 0x01,
	Third = 0x02,
}

export enum MacroType {
	/** Uses loopTimes */
	FIXED_LOOP = 0x00,

	/** Runs until any key interrupts it */
	UNTIL_KEY_PRESS = 0x01,

	/** Executes while the button remains pressed */
	WHILE_PRESSED = 0x02,
}

export class MacroBuilder implements BaseProtocolBuilder {
	private _firstPacket: Uint8Array = new Uint8Array(ReportPacketLength.MACRO);
	private _firstPacketView: DataView = new DataView(this._firstPacket.buffer);

	private _secondPacket: Uint8Array = new Uint8Array(ReportPacketLength.MACRO);
	private _secondPacketView: DataView = new DataView(this._secondPacket.buffer);

	private _thirdPacket: Uint8Array = new Uint8Array(ReportPacketLength.MACRO);
	private _thirdPacketView: DataView = new DataView(this._thirdPacket.buffer);

	private _actions: Uint8Array = new Uint8Array(100); // this is the maximum size reserved for actions
	private _actionsOffset: number = 0;

	private _id: number = 0x01;
	private _type: MacroType = MacroType.FIXED_LOOP;
	private _macroGunRGB: RGB = { r: 0x00, g: 0x00, b: 0x00 };
	private _loopTimes: number = 1;
	private _name: string = 'macro1';
	private _macroCount: number = 0;

	constructor(options?: MacroBuilderOptions) {
		// set headers
		this._firstPacketView.setUint8(0, ReportId.MACRO);
		this._firstPacketView.setUint8(1, ReportPacketLength.MACRO);
		this._firstPacketView.setUint8(2, this._id);
		this._firstPacketView.setUint8(3, MacroPages.First);

		// set headers
		this._secondPacketView.setUint8(0, ReportId.MACRO);
		this._secondPacketView.setUint8(1, ReportPacketLength.MACRO);
		this._secondPacketView.setUint8(2, this._id);
		this._secondPacketView.setUint8(3, MacroPages.Second);

		// set headers
		this._thirdPacketView.setUint8(0, ReportId.MACRO);
		this._thirdPacketView.setUint8(1, ReportPacketLength.MACRO);
		this._thirdPacketView.setUint8(2, this._id);
		this._thirdPacketView.setUint8(3, MacroPages.Third);

		this.setId(options?.id ?? this._id);
		this.setType(options?.type ?? this._type);
		this.setMacroGunRGB(options?.macroGunRGB ?? this._macroGunRGB);
		this.setLoopTimes(options?.loopTimes ?? this._loopTimes);
		this.setName(options?.name ?? this._name);

		if (options?.actions) this.setBulkActions(options.actions);
	}

	setId(id: number): this {
		if (id < 0x00 || id > 0xff)
			throw new ParamsError(`Invalid macro id; expected 0x00 to 0xff, but received ${id}`);
		this._id = id;

		this._firstPacketView.setUint8(2, this._id);
		this._secondPacketView.setUint8(2, this._id);
		this._thirdPacketView.setUint8(2, this._id);

		return this;
	}

	getId(): number {
		this._id = this._firstPacketView.getUint8(2);
		return this._id;
	}

	setType(type: MacroType): this {
		this._type = type;
		this._firstPacketView.setUint8(4, type);
		return this;
	}

	getType(): MacroType {
		this._type = this._firstPacketView.getUint8(4);
		return this._type;
	}

	setMacroGunRGB(color: RGB): this {
		this._macroGunRGB = color;
		this._firstPacketView.setUint8(5, color.r);
		this._firstPacketView.setUint8(6, color.g);
		this._firstPacketView.setUint8(7, color.b);
		return this;
	}

	getMacroGunRGB(): RGB {
		const r = this._firstPacketView.getUint8(5);
		const g = this._firstPacketView.getUint8(6);
		const b = this._firstPacketView.getUint8(7);

		this._macroGunRGB = { r, g, b };
		return this._macroGunRGB;
	}

	setLoopTimes(repeatTimes: number): this {
		this._loopTimes = repeatTimes;
		this._firstPacketView.setUint8(8, repeatTimes);
		return this;
	}

	getLoopTimes(): number {
		this._loopTimes = this._firstPacketView.getUint8(8);
		return this._loopTimes;
	}

	setName(name: string): this {
		const macroNameBytes = encodeFixedUtf8(name, 20);

		this._name = decodeFixedUtf8(macroNameBytes.bytes).value;
		this._firstPacket.set(macroNameBytes.bytes, 9);

		return this;
	}

	getName(): string {
		this._name = decodeFixedUtf8(this._firstPacket.subarray(9, 28)).value;

		return this._name;
	}

	getActionCount(): number {
		this._macroCount = this._firstPacketView.getUint8(29);
		return this._macroCount;
	}

	setBulkActions(actions: MacroAction[]): this {
		for (const action of actions) {
			this.setAction(action);
		}

		return this;
	}

	setAction(action: MacroAction): this {
		const actionToBuffer = action.toBuffer();

		if (actionToBuffer.length + this._actionsOffset > this._actions.length) {
			throw new ParamsError('action', 'Max actions reached; cannot add more actions to the macro.', {
				cause: action,
			});
		}

		this._actions.set(actionToBuffer, this._actionsOffset);
		this._actionsOffset += actionToBuffer.length;

		this._macroCount += action.isExtended ? 2 : 1;
		this._firstPacketView.setUint8(29, this._macroCount);

		return this;
	}

	private calculateChecksum(): number {
		let checksum = 0x0000;

		for (let i = 4; i < this._firstPacket.length; i++) {
			checksum += this._firstPacketView.getUint8(i);
		}

		for (let i = 4; i < this._secondPacket.length; i++) {
			checksum += this._secondPacketView.getUint8(i);
		}

		for (let i = 4; i < 9; i++) {
			checksum += this._thirdPacketView.getUint8(i);
		}

		return checksum;
	}

	public build(_mode: ConnectionMode): [Uint8Array, Uint8Array, Uint8Array] {
		this._firstPacket.set(this._actions.subarray(0, 34), 30);
		this._secondPacket.set(this._actions.subarray(34, 94), 4);
		this._thirdPacket.set(this._actions.subarray(94, 100), 4);

		this._thirdPacketView.setInt16(10, this.calculateChecksum());

		return [this._firstPacket, this._secondPacket, this._thirdPacket];
	}

	toHexString(): [string, string, string] {
		return [this._firstPacket.toHex(), this._secondPacket.toHex(), this._thirdPacket.toHex()];
	}
}

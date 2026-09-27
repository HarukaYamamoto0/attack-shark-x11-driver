import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import { type ConnectionMode, type ProfileId, ReportId, ReportPacketLength } from '../types.js';

export enum Rate {
	PowerSaving = 125,
	Office = 250,
	Gaming = 500,
	ESports = 1000,
}

const rateToHex: Record<Rate, number> = {
	[Rate.PowerSaving]: 0x08,
	[Rate.Office]: 0x04,
	[Rate.Gaming]: 0x02,
	[Rate.ESports]: 0x01,
};

export interface PollingRateBuilderOptions {
	profileId?: ProfileId;
	rate?: Rate;
}

/**
 * PollingRateBuilder is a utility class used for building and configuring a polling rate packet
 * for communications in compliance with the BaseProtocolBuilder interface.
 * It allows setting specific parameters such as profile ID and rate, and performs checksum calculations
 * to ensure the integrity of the resulting communication packet.
 *
 * The class internally manages a buffer and provides tools to build the desired packet configuration.
 *
 * @implements {BaseProtocolBuilder}
 */
export class PollingRateBuilder implements BaseProtocolBuilder {
	private _buffer: Uint8Array = new Uint8Array(9).fill(0x00);
	private _view: DataView = new DataView(this._buffer.buffer, this._buffer.byteOffset, this._buffer.byteLength);

	private _profileId: ProfileId = 0x01;
	private _rate: Rate = Rate.ESports;

	constructor(options?: PollingRateBuilderOptions) {
		// set headers
		this._view.setInt8(0, ReportId.POLLING_RATE);
		this._view.setInt8(1, ReportPacketLength.POLLING_RATE);

		this.setProfileId(options?.profileId ? options.profileId : this._profileId);
		this.setRate(options?.rate ? options.rate : this._rate);
	}

	public setProfileId(id: ProfileId): this {
		this._profileId = id;

		this._view.setInt8(2, id);

		return this;
	}

	public getProfileId(): ProfileId {
		return this._profileId;
	}

	calculateChecksum(): void {
		const rate: Rate = this._view.getUint8(3);

		this._view.setInt8(4, rate ^ 0xff);
	}

	setRate(rate: Rate): this {
		this._rate = rate;

		const rateHex = rateToHex[rate];
		if (!rateHex) throw new ParamsError('rate', `Unsupported Polling Rate: ${rate}`);

		this._view.setInt8(3, rateHex);

		return this;
	}

	build(_mode: ConnectionMode): Uint8Array {
		this.calculateChecksum();
		return this._buffer;
	}

	toHexString(): string {
		return this._buffer.toHex();
	}
}

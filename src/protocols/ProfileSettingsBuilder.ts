import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { MAX_PROFILES, type Profile } from '../types.js';
import { ConnectionMode, ReportId, ReportPacketLength } from '../types.js';
import { ParamsError } from '../errors';

/**
 * Represents configuration options for changing profile builder behavior.
 *
 * @interface ChangeProfileBuilderOptions
 * @property {number} [currentProfileId] - The identifier of the current profile.
 * @property {number} [maxProfileCount] - The maximum number of profiles allowed.
 */
export interface ChangeProfileBuilderOptions {
	currentProfileId?: number;
	maxProfileCount?: number;
}

export class ProfileSettingsBuilder implements BaseProtocolBuilder {
	private _buffer: Uint8Array = new Uint8Array(ReportPacketLength.PROFILE_SETTING).fill(0x00);
	private _view: DataView = new DataView(this._buffer.buffer, this._buffer.byteOffset, this._buffer.byteLength);

	private _currentProfileId: Profile = 0x01;
	private _maxProfileCount: number = 0x01;

	constructor(options?: ChangeProfileBuilderOptions) {
		// set headers
		this._view.setInt8(0, ReportId.PROFILE_SETTING);
		this._view.setInt8(1, ReportPacketLength.PROFILE_SETTING);

		this.setCurrentProfile(options?.currentProfileId ?? this._currentProfileId);
		this.setMaxProfileCount(options?.maxProfileCount ?? this._maxProfileCount);
	}

	/**
	 * Sets the current profile ID and updates the corresponding internal state.
	 *
	 * @param {Profile} currentProfileId - The ID of the profile to be set as the current profile. It must not exceed the maximum allowed profiles.
	 * @return {this} Returns the instance of the class to allow method chaining.
	 * @throws {ParamsError} Throws an error if the provided profile ID exceeds the maximum allowed limit.
	 */
	setCurrentProfile(currentProfileId: Profile): this {
		if (currentProfileId > MAX_PROFILES)
			throw new ParamsError(
				'currentProfileId',
				`Oops, it looks like the value provided exceeds the maximum limit of ${MAX_PROFILES} secure profiles.`,
			);

		this._currentProfileId = currentProfileId;

		this._view.setInt8(2, currentProfileId);
		this.updateChecksum();
		return this;
	}

	getCurrentProfile(): Profile {
		this._currentProfileId = this._view.getUint8(2);

		return this._currentProfileId;
	}

	/**
	 * Sets the maximum number of profiles allowed.
	 *
	 * @param {number} maxProfileCount - The maximum number of profiles. Must not exceed the predefined limit.
	 * @return {this} The current instance of the object.
	 * @throws {ParamsError} If the maxProfileCount exceeds the predefined maximum limit.
	 */
	setMaxProfileCount(maxProfileCount: number): this {
		if (maxProfileCount > MAX_PROFILES)
			throw new ParamsError(
				'maxProfileCount',
				`Oops, it looks like the value provided exceeds the maximum limit of ${MAX_PROFILES} secure profiles.`,
			);

		this._maxProfileCount = maxProfileCount;

		this._view.setInt8(4, maxProfileCount);
		return this;
	}

	getMaxProfileCount(): number {
		this._maxProfileCount = this._view.getUint8(4);

		return this._maxProfileCount;
	}

	updateChecksum(): this {
		this._view.setUint8(3, ~this._currentProfileId & 0xff);
		this._view.setUint8(5, ~this._maxProfileCount & 0xff);

		return this;
	}

	build(mode: ConnectionMode): Uint8Array {
		this.updateChecksum();

		return mode === ConnectionMode.Wired ? this._buffer.subarray(0, 6) : this._buffer;
	}

	toHexString(): string {
		return this._buffer.toHex();
	}
}

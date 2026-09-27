import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ConnectionMode, type ProfileId, ReportId, ReportPacketLength } from '../types.js';

export interface ChangeProfileBuilderOptions {
	profileId?: number;
	maxProfileCount?: number;
}

export class ProfileSettingsBuilder implements BaseProtocolBuilder {
	private _buffer: Uint8Array = new Uint8Array(ReportPacketLength.PROFILE_SETTING).fill(0x00);
	private _view: DataView = new DataView(this._buffer.buffer, this._buffer.byteOffset, this._buffer.byteLength);

	private _profileId = 0x01;
	private _currentProfileId = 0x01;
	private _maxProfileCount = 0x05;

	constructor(options?: ChangeProfileBuilderOptions) {
		// set headers
		this._view.setInt8(0, ReportId.PROFILE_SETTING);
		this._view.setInt8(1, ReportPacketLength.PROFILE_SETTING);

		this.setProfileId(options?.profileId ?? this._profileId);
		this.setCurrentProfile(options?.profileId ?? this._currentProfileId);
		this.setMaxProfileCount(options?.maxProfileCount ?? this._maxProfileCount);
	}

	setProfileId(profileId: ProfileId): this {
		this._profileId = profileId;
		this._currentProfileId = profileId;

		this._view.setInt8(2, profileId);
		return this;
	}

	getProfileId(): ProfileId {
		this._profileId = this._view.getUint8(2);

		return this._profileId;
	}

	setCurrentProfile(profileId: ProfileId): this {
		this._currentProfileId = profileId;

		this._view.setInt8(3, profileId);
		return this;
	}

	getCurrentProfile(): ProfileId {
		this._currentProfileId = this._view.getUint8(3);

		return this._currentProfileId;
	}

	setMaxProfileCount(maxProfileCount: number): this {
		this._maxProfileCount = maxProfileCount;

		this._view.setInt8(5, maxProfileCount);
		return this;
	}

	getMaxProfileCount(): number {
		this._maxProfileCount = this._view.getUint8(5);

		return this._maxProfileCount;
	}

	private updateChecksum(): void {
		this._view.setUint8(4, ~this._currentProfileId & 0xff);
		this._view.setUint8(6, ~this._maxProfileCount & 0xff);
	}

	build(mode: ConnectionMode): Uint8Array {
		this.updateChecksum();

		return mode === ConnectionMode.Wired ? this._buffer.subarray(0, 6) : this._buffer;
	}

	toHexString(): string {
		return this._buffer.toHex();
	}
}

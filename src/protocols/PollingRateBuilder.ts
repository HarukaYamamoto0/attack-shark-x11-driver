import type { BaseProtocolBuilder } from '../core/BaseProtocolBuilder.js';
import { ParamsError } from '../errors.js';
import type { ConnectionMode } from '../types.js';

export enum Rate {
	powerSaving = 125,
	office = 250,
	gaming = 500,
	eSports = 1000,
}

export interface PollingRateBuilderOptions {
	rate?: Rate;
}

/**
 * Builder for configuring the update rate (Polling Rate).
 */
export class PollingRateBuilder implements BaseProtocolBuilder {
	public static readonly DEFAULT_OPTIONS: PollingRateBuilderOptions = {
		rate: Rate.eSports,
	};
	readonly buffer: Buffer = Buffer.alloc(64);
	public readonly bmRequestType: number = 0x21;
	public readonly bRequest: number = 0x09;
	public readonly wValue: number = 0x0306;
	public readonly wIndex: number = 2;

	constructor(options: PollingRateBuilderOptions = { rate: Rate.eSports }) {
		this.buffer = Buffer.alloc(9);
		this.buffer[0] = 0x06; // header
		this.buffer[1] = 0x09; // header
		this.buffer[2] = 0x01; // header
		this.buffer[3] = 0x01; // polling rate
		this.buffer[4] = 0xfe; // checksum
		this.buffer[5] = 0x00; // padding
		this.buffer[6] = 0x00; // padding
		this.buffer[7] = 0x00; // padding
		this.buffer[8] = 0x00; // padding

		const config = { ...PollingRateBuilder.DEFAULT_OPTIONS, ...options };

		if (config.rate !== undefined) this.setRate(config.rate);
	}

	/**
	 * Creates an instance already configured for a specific rate
	 * @deprecated
	 */
	static forRate(rate: Rate): PollingRateBuilder {
		return new PollingRateBuilder().setRate(rate);
	}

	calculateChecksum(): number {
		return 0xff - (this.buffer[3] ?? 0x00);
	}

	/**
	 * Sets the update rate (Polling Rate).
	 * @param rate Rate option (125, 250, 500, or 1000 Hz).
	 *
	 * @example
	 * ```typescript
	 * builder.setRate(Rate.eSports); // 1000Hz
	 * ```
	 */
	setRate(rate: Rate): this {
		const rateMap: Record<Rate, number> = {
			[Rate.powerSaving]: 0x08,
			[Rate.office]: 0x04,
			[Rate.gaming]: 0x02,
			[Rate.eSports]: 0x01,
		};

		const value = rateMap[rate];
		if (value !== undefined) {
			this.buffer[3] = value;
		} else {
			throw new ParamsError('rate', `Unsupported Polling Rate: ${rate}`);
		}

		return this;
	}

	build(_mode: ConnectionMode): Buffer {
		// In both connection modes, the buffer is the same.
		this.buffer[4] = this.calculateChecksum();
		return this.buffer;
	}

	toString(): string {
		return this.buffer.toString('hex');
	}

	compareWithHexString(value: string): boolean {
		return this.toString() === value;
	}
}

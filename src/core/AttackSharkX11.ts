// noinspection JSUnusedGlobalSymbols

import { EventEmitter } from 'node:events';
import {
	CommandInProgressError,
	ControlTransferError,
	DriverError,
	SendCommandError,
	TimeoutError,
} from '../errors.js';
import { DpiBuilder, type DpiBuilderOptions } from '../protocols/DpiBuilder.js';
import { ChangeProfileBuilder } from '../protocols/ChangeProfileBuilder';
import { ButtonMappingBuilder, type ButtonMappingBuilderOptions } from '../protocols/ButtonMappingBuilder';
import { PollingRateBuilder, type Rate } from '../protocols/PollingRateBuilder.js';
import { LightingSettingsBuilder, type LightingSettingsBuilderOptions } from '../protocols/LightingSettingsBuilder';
import {
	BatteryStatus,
	CommandConfirmation,
	ConnectionMode,
	type Logger,
	MessageTypes,
	MessageTypesLength,
	type Option,
	PacketLength,
	type PendingCommand,
	ReportId,
	type Result,
} from '../types.js';
import { delay } from '../utils/delay.js';
import { handleResponsePollingRate } from '../handles/handleResponsePollingRate';
import { handleResponseLightingSettings } from '../handles/handleResponseLightingSettings';
import { handleResponseDpi } from '../handles/handleResponseDpi';
import { handleResponseButtonMapping } from '../handles/handleResponseButtonMapping';
import { handleMacroResponse } from '../handles/hadleMacroResponse';
import type { MacroBuilder } from '../protocols/MacroBuilder';
import { handleBatteryMessage } from '../handles/messages/handleBatteryMessage';
import { handleCommandConfirmation } from '../handles/messages/handleCommandConfirmation';
import { type MouseTransport } from './transport';
import { VID } from '../index';
import { HidTransport } from './transport/HidTransport';
import { hex } from '../logger/hex';

/**
 * Events emitted by the AttackSharkX11 class.
 */
export interface AttackSharkX11Events {
	/** Emitted when the battery level changes */
	batteryChange: [status: BatteryStatus, percentage: number];
	/**
	 * Represents the confirmation details of a specific command execution.
	 */
	commandConfirmation: [reportId: ReportId, success: boolean];
	/** Emitted when a data monitoring error occurs */
	error: [error: Error];
}

/**
 * Represents the AttackSharkX11 driver, designed for managing the communication and control of the Attack Shark X11 device.
 * It facilitates device connection, monitors battery status, handles command confirmation, and manages data exchange.
 */
export class AttackSharkX11 extends EventEmitter<AttackSharkX11Events> {
	private transport?: MouseTransport | undefined;
	public productId: number | undefined;
	// this is the primary device used for sending commands.
	private battery_status: BatteryStatus = BatteryStatus.CHARGING_IN_PROGRESS;
	private battery_percentage: number = -1;
	private logger: Logger | null;
	/**
	 * A boolean flag indicating whether a sending operation is currently in progress.
	 * If true, it represents that the operation is active; otherwise, it is not.
	 */
	public isSending: boolean = false;
	// the ID of the report associated with the last pending command
	public lastPendingCommandReportId: ReportId | null = null;
	// represents the result of the last pending command execution.
	public lastPendingCommandResult: boolean | null = false;
	// internal control of pending command reactive confirmation (ACK)
	private pendingCommand: PendingCommand | null = null;

	/**
	 * @param options Configuration options for the driver
	 * @param options.logger Optional custom logger
	 */
	constructor(options?: { logger?: Logger; transport?: MouseTransport }) {
		super();

		this.logger = options?.logger ?? null;
		this.transport = options?.transport ?? undefined;
	}

	/**
	 * Returns to the current connection mode.
	 */
	get connectionMode(): ConnectionMode {
		return this.productId as ConnectionMode;
	}

	get connectionModeInHex(): string {
		return this.productId !== undefined ? `0x${this.productId.toString(16)}` : 'undefined';
	}

	async open(): Promise<void> {
		try {
			if (!this.transport)
				this.transport = new HidTransport({
					vendorId: VID,
					productIds: {
						wired: ConnectionMode.Wired,
						wireless: ConnectionMode.Wireless,
					},
				});

			await this.transport.open();

			this.transport.onData(this.handleData);
			this.transport.onError(this.handleError);
		} catch (err) {
			const errorMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err);
			throw new DriverError(`Oops, a problem occurred while trying to open the device: ${errorMessage}`);
		}
	}

	/**
	 * Processes incoming binary data and handles various message types based on their
	 * structure and content. The function parses the provided Uint8Array, extracts
	 * relevant information via a DataView, and performs operations such as updating
	 * battery status, confirming commands, or ignoring unhandled message types.
	 *
	 * @param {Uint8Array} data - The binary data buffer received for processing, which
	 *                            contains the message type and associated parameters.
	 *
	 * The `handleData` method is structured to:
	 * - Parse the incoming binary data using DataView for extracting specific byte information.
	 * - Identify the type of message based on its byte contents.
	 * - Handle battery status updates by extracting parameters and emitting a `batteryChange` event.
	 * - Process command confirmations by updating internal states, emitting a `commandConfirmation`
	 *   event, and resolving any pending command promises if applicable.
	 * - Log appropriate messages or errors when processing message types.
	 *
	 * This method is specifically designed to cater to message types in the MessageTypes enumeration.
	 * Unhandled or unknown message types are ignored and logged for debugging purposes.
	 */
	private handleData = (data: Uint8Array): void => {
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

		switch (view.byteLength) {
			case MessageTypesLength: {
				const msgType = view.getUint8(2);
				const params1 = view.getUint8(3);
				const params2 = view.getUint8(4);

				this.logger?.info(`received a new message: ${data.toHex()}`, 'AttackSharkX11-handleData'); // TODO: configure the logLevel

				switch (msgType) {
					case MessageTypes.BATTERY:
					case MessageTypes.BATTERY1: {
						try {
							const response = handleBatteryMessage(params1, params2);

							if (response) {
								this.battery_status = response.status;
								this.battery_percentage = response.percentage;

								this.emit('batteryChange', this.battery_status, this.battery_percentage);
							}
						} catch (err) {
							this.logger?.error(`Error handling battery message: ${err}`, 'AttackSharkX11-handleData');
						}
						break;
					}
					case MessageTypes.COMMAND_CONFIRMATION: {
						try {
							if (!this.pendingCommand) return;

							const response = handleCommandConfirmation(params1, params2);
							if (!response) return;

							if (this.pendingCommand.reportId !== response.reportId) {
								this.pendingCommand.reject(
									new TimeoutError(
										'It appears a command confirmation occurred, but the confirmation differs from what was expected, indicating that something is wrong',
									),
								);
							}

							this.pendingCommand.resolve(response.status);

							if (response.status === CommandConfirmation.Failure) {
								this.logger?.error(
									'the command confirmation returned a failure code',
									'AttackSharkX11-handleData',
								);
							}
							this.pendingCommand = null;
						} catch (err) {
							this.logger?.error(
								`Error handling command confirmation: ${err}`,
								'AttackSharkX11-handleData',
							);
						}
						break;
					}
					default: {
						this.logger?.debug(
							`In the messaging event, an event was ignored because it lacked proper handling;` +
								` event code: ${hex(msgType)}, params1: ${hex(view.getUint8(3))}, params2: ${hex(view.getUint8(4))}`,
							'AttackSharkX11-handleData-messages',
						);
					}
				}
				break;
			}
			default: {
				// TODO: add handlers
			}
		}
	};

	private handleError = (error: Error): void => {
		const errorMessage = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
		// Suppress "could not read" errors if they are expected on some Windows HID collections
		if (errorMessage.includes('could not read')) {
			this.logger?.debug('Suppressed HID read error:', errorMessage);
			return;
		}
		const errorObj = error instanceof Error ? error : new Error(errorMessage);
		if (this.listenerCount('error') > 0) {
			this.emit('error', errorObj);
		} else {
			this.logger?.error('Unhandled HID error:', errorObj);
		}
	};

	/**
	 * Closes the connection to the device, stops polling, and releases the interfaces.
	 * It is important to call this method when finishing use to avoid resource leaks.
	 */
	async close(): Promise<void> {
		if (!this.transport) return;

		this.pendingCommand = null;
		this.removeAllListeners();

		try {
			await this.transport.close();
		} catch (e: unknown) {
			new DriverError('an error occurred while attempting to close the transport', { cause: e });
		}
	}

	checkIsOpen(): void {
		if (!this.transport) throw new DriverError('You have to open the device first');
	}

	private rejectPendingCommand(error: unknown): void {
		const pending = this.pendingCommand;
		if (!pending) return;

		clearTimeout(pending.timeout);
		pending.reject(error instanceof Error ? error : new Error(String(error)));
		this.pendingCommand = null;
	}

	async sendCommand(
		reportId: ReportId,
		buffer: Uint8Array,
		timeoutMs: number = 1000,
		// TODO: retries: number = 0,
	): Promise<CommandConfirmation> {
		this.checkIsOpen();
		if (this.pendingCommand) throw new CommandInProgressError({ cause: this.pendingCommand });

		const promise = new Promise<CommandConfirmation>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingCommand = null;

				reject(new TimeoutError(`timeout waiting for ACK of report 0x${reportId.toString(16)}`));
			}, timeoutMs);

			this.pendingCommand = {
				reportId,
				resolve,
				reject,
				timeout,
			};
		});

		try {
			await this.sendFeatureReport(buffer);
		} catch (error) {
			this.rejectPendingCommand(error);
			throw error;
		}

		return promise;
	}

	/**
	 * Sends a feature report to the HID device using the provided buffer.
	 *
	 * @param {Uint8Array} buffer The data to be sent to the HID device as a feature report.
	 * @return {Promise<number>} A promise that resolves to the number of bytes sent in the feature report.
	 * @throws {DriverError} Thrown if the device is not open when the method is called.
	 * @throws {ControlTransferError} Thrown if the control transfer fails during the operation.
	 */
	async sendFeatureReport(buffer: Uint8Array): Promise<number> {
		this.checkIsOpen();
		if (this.transport === undefined) throw new DriverError('You have to open the device first');

		try {
			const response = await this.transport.sendFeatureReport(Buffer.from(buffer));

			this.logger?.debug(`sending command with buffer: ${buffer.toHex()}`, 'AttackSharkX11-sendFeatureReport');

			return response;
		} catch (err) {
			console.log(err);
			this.logger?.error(`failed: ${buffer.toHex()}`, 'AttackSharkX11-sendFeatureReport');

			throw new ControlTransferError('Control transfer failed', { cause: err });
		}
	}

	/**
	 * Reads a Feature Report of a given reportId and length from the HID device.
	 *
	 * @param {ReportId} reportId - The report ID to be queried.
	 * @param {PacketLength} report_length - The expected byte length of the report.
	 * @return {Promise<Result<Uint8Array, number>>} A promise that resolves to the received Uint8Array or an error code.
	 * @throws {DriverError} If the device is not opened or the report read request fails.
	 * @throws {ControlTransferError} If the transfer fails.
	 */
	async getFeatureReport(reportId: ReportId, report_length: PacketLength): Promise<Result<Uint8Array, number>> {
		if (!this.transport) throw new DriverError('You have to open the device first');

		try {
			await this.sendFeatureReport(Buffer.from([0xa0, reportId, report_length, 0x00, 0x01, 0x00, 0x00, 0x00]));

			await delay(250);

			const checkStatus = await this.transport?.getFeatureReport(0xa0, 8); // status check

			if (checkStatus && checkStatus?.[1] !== 0x01) {
				throw new DriverError(
					`Something went wrong, and the firmware did not enable reading of reportId: ${reportId.toString(16).padStart(2, '0')}`,
				);
			}

			const data: Uint8Array = await this.transport.getFeatureReport(reportId, report_length);
			this.logger?.info(`received buffer: ${data.toHex()}`, 'AttackSharkX11-getFeatureReport');
			if (data) return data;
			else return -1;
		} catch (err) {
			throw new ControlTransferError('Control transfer (sendFeatureReport) failed', { cause: err });
		}
	}

	/**
	 * Registers a listener function to be called whenever the battery status or percentage changes.
	 * The listener will receive real-time updates about the device's battery state.
	 *
	 * @param listener A callback function that receives the updated battery status and percentage.
	 *   - `status`: The current battery status (e.g., charging, discharging, fully charged).
	 *   - `percentage`: The current battery percentage level (0-100).
	 * @return A function to remove the registered listener when it's no longer needed.
	 *
	 * @example
	 * ```TypeScript
	 * const unsubscribe = device.onBatteryChange((status, percentage) => {
	 *   console.log(`Battery: ${percentage}%`, status);
	 * });
	 *
	 * // Later, when you want to stop listening:
	 * unsubscribe();
	 * ```
	 * @deprecated The driver now extends `EventEmitter`; use the `on` method to listen for events.
	 */
	onBatteryChange(listener: (status: BatteryStatus, percentage: number) => void): () => void {
		this.checkIsOpen();

		this.on('batteryChange', listener);

		return () => {
			this.removeListener('batteryChange', listener);
		};
	}

	setPollingRate(rate: Rate | PollingRateBuilder, timeoutMs?: number): Promise<CommandConfirmation> {
		this.checkIsOpen();
		try {
			const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);
			return this.sendCommand(ReportId.POLLING_RATE, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set polling rate`, { cause: err });
		}
	}

	setMapping(
		config: ButtonMappingBuilderOptions | ButtonMappingBuilder,
		timeoutMs?: number,
	): Promise<CommandConfirmation> {
		this.checkIsOpen();
		try {
			const builder = config instanceof ButtonMappingBuilder ? config : new ButtonMappingBuilder(config);
			return this.sendCommand(ReportId.BUTTON_MAPPING, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set button mapping`, { cause: err });
		}
	}

	setLightingSettings(
		options: LightingSettingsBuilder | LightingSettingsBuilderOptions,
		timeoutMs?: number,
	): Promise<CommandConfirmation> {
		this.checkIsOpen();
		try {
			const builder = options instanceof LightingSettingsBuilder ? options : new LightingSettingsBuilder(options);
			return this.sendCommand(ReportId.LIGHTING_SETTINGS, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set lighting settings`, { cause: err });
		}
	}

	sendInternalStateResetReportBuilder(): Promise<CommandConfirmation> {
		this.checkIsOpen();
		const builder = new ChangeProfileBuilder();

		return this.sendCommand(ReportId.PROFILE, builder.build(this.connectionMode));
	}

	resetPollingRate(): Promise<CommandConfirmation> {
		this.checkIsOpen();
		const builder = new PollingRateBuilder();

		return this.sendCommand(ReportId.POLLING_RATE, builder.build(this.connectionMode));
	}

	setDpi(options: DpiBuilder | DpiBuilderOptions): Promise<CommandConfirmation> {
		this.checkIsOpen();
		const builder = options instanceof DpiBuilder ? options : new DpiBuilder(options);

		return this.sendCommand(ReportId.DPI, builder.build(this.connectionMode));
	}

	async getDpi(): Promise<Option<DpiBuilder>> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.DPI, PacketLength.DPI);
		if (typeof response === 'number') return null;

		return handleResponseDpi(response);
	}

	async getButtonMapping(): Promise<Option<ButtonMappingBuilder>> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.BUTTON_MAPPING, PacketLength.BUTTON_MAPPING);
		if (typeof response === 'number') return null;

		return handleResponseButtonMapping(response);
	}

	async getMacro(): Promise<Option<MacroBuilder>> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.MACRO, PacketLength.MACRO);
		if (typeof response === 'number') return null;

		return handleMacroResponse(response);
	}

	async getPollingRate(): Promise<Option<Rate>> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.POLLING_RATE, PacketLength.POLLING_RATE);
		if (typeof response === 'number') return null;

		return handleResponsePollingRate(response);
	}

	async getLightingSettings(): Promise<Option<LightingSettingsBuilder>> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.LIGHTING_SETTINGS, PacketLength.LIGHTING_SETTINGS);
		if (typeof response === 'number') return null;

		return handleResponseLightingSettings(response);
	}

	resetDpi(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new DpiBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetMacro(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new ButtonMappingBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetUserPreferences(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new LightingSettingsBuilder().setKeyResponse(8);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Resets all device settings to factory defaults.
	 */
	async reset(): Promise<void> {
		this.checkIsOpen();
		await this.sendInternalStateResetReportBuilder();
		await this.resetDpi();
		await this.resetUserPreferences();
		await this.resetPollingRate();
		await this.resetMacro();
		// await this.resetCustomMacro();
	}
}

export default AttackSharkX11;

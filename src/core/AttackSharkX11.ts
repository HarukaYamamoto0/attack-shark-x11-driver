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
import { ProfileSettingsBuilder } from '../protocols/ProfileSettingsBuilder';
import { ButtonMappingBuilder, type ButtonMappingBuilderOptions } from '../protocols/ButtonMappingBuilder';
import { PollingRateBuilder, type Rate } from '../protocols/PollingRateBuilder.js';
import { LightingSettingsBuilder, type LightingSettingsBuilderOptions } from '../protocols/LightingSettingsBuilder';
import {
	BatteryStatus,
	ConnectionMode,
	type Logger,
	MessageTypes,
	MessageTypesLength,
	type PendingCommand,
	ReportId,
	ReportReadLength,
} from '../types.js';
import { delay } from '../utils/delay.js';
import { handleResponsePollingRate } from '../handles/handleResponsePollingRate';
import { handleResponseLightingSettings } from '../handles/handleResponseLightingSettings';
import { handleResponseDpi } from '../handles/handleResponseDpi';
import { handleResponseButtonMapping } from '../handles/handleResponseButtonMapping';
import { handleMacroResponse } from '../handles/hadleMacroResponse';
import { MacroBuilder, type MacroBuilderOptions } from '../protocols/MacroBuilder';
import { handleBatteryMessage } from '../handles/messages/handleBatteryMessage';
import { CommandConfirmation, handleCommandConfirmation } from '../handles/messages/handleCommandConfirmation';
import { type MouseTransport } from './transport';
import { VID } from '../index';
import { HidTransport } from './transport/HidTransport';
import { hex } from '../logger/hex';
import { handleProfileSettings } from '../handles/handleProfileSettings';

/** Events emitted by the AttackSharkX11 class */
export interface AttackSharkX11Events {
	/** Emitted when the battery level changes */
	batteryChange: [status: BatteryStatus, percentage: number];
	/** Represents the confirmation details of a specific command execution. */
	commandConfirmation: [reportId: ReportId, success: boolean];
	/** Emitted when a data monitoring error occurs */
	error: [error: Error];
}

/**
 * Represents the AttackSharkX11 driver, designed for managing the communication and control of the Attack Shark X11 device.
 * It facilitates device connection, monitors battery status, handles command confirmation, and manages data exchange.
 */
export class AttackSharkX11 extends EventEmitter<AttackSharkX11Events> {
	private logger: Logger | null;
	public productId: number | undefined;
	public transport?: MouseTransport | undefined;

	private battery_status: BatteryStatus = BatteryStatus.CHARGING_IN_PROGRESS;
	private battery_percentage: number = -1;

	// internal control of pending command reactive confirmation (ACK)
	private pendingCommand: PendingCommand | null = null;
	private hasReadPermission: boolean = false;

	/**
	 * Initializes a new instance of the class.
	 *
	 * @param {Object} [options] - The configuration options for the constructor.
	 * @param {Logger} [options.logger] - An optional logger instance for logging purposes.
	 * @param {MouseTransport} [options.transport] - An optional transport instance for handling mouse interactions.
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

	/**
	 * Opens a connection to the device via the transport layer and initializes the necessary handlers.
	 * If the transport is not already created, it initializes the transport with specific vendor and product IDs.
	 * Sets up handlers to process incoming data and handle errors from the device.
	 *
	 * @return {Promise<void>} A promise that resolves when the connection is successfully opened or rejects with an error if the operation fails.
	 */
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
									new DriverError(
										'It appears a command confirmation occurred, but the confirmation differs from what was expected, indicating that something is wrong',
									),
								);
							}

							this.pendingCommand.resolve(response.status);
							clearTimeout(this.pendingCommand.timeout);
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
				// TODO: add more handlers
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
		if (this.transport === undefined) throw new DriverError('You have to open the device first');
		if (this.pendingCommand) throw new CommandInProgressError({ cause: this.pendingCommand });

		const promise = new Promise<CommandConfirmation>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingCommand = null;

				reject(new TimeoutError(`timeout waiting for ACK of report ${hex(reportId)}`));
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
		if (this.transport === undefined) throw new DriverError('You have to open the device first');

		try {
			this.logger?.debug(`sending feature report: ${buffer.toHex()}`, 'AttackSharkX11-sendFeatureReport');

			return await this.transport.sendFeatureReport(buffer);
		} catch (err) {
			this.logger?.error(`failed to send feature report: ${buffer.toHex()}`, 'AttackSharkX11-sendFeatureReport');

			throw new ControlTransferError('Control transfer failed', { cause: err });
		}
	}

	/**
	 * Requests read permission for the specified report ID.
	 *
	 * @param {ReportId} reportId - The ID of the report for which read permission is being requested.
	 * @param {ReportReadLength} packetLengthRead - The length of the report packet to read.
	 * @param {number} [parameter=0x01] - An optional parameter to customize the request. Defaults to 0x01 if not provided.
	 * @return {Promise<void>} A promise that resolves when the read permission request is successfully processed or rejects with an error if the request fails.
	 */
	private async requestReadPermission(
		reportId: ReportId,
		packetLengthRead: ReportReadLength,
		parameter: number = 0x01,
	): Promise<void> {
		if (!this.transport) {
			throw new DriverError('You have to open the device first');
		}

		const PERMISSION_COMMAND = 0xa0;
		const RESPONSE_LENGTH = 8;
		const PERMISSION_GRANTED_STATUS = 0x01;
		const READ_PERMISSION_DELAY_MS = 250;
		const LOG_TAG = 'AttackSharkX11-getFeatureReport';

		try {
			const requestBuffer = new Uint8Array([
				PERMISSION_COMMAND,
				reportId,
				packetLengthRead,
				0x00,
				parameter,
				0x00,
				0x00,
				0x00,
			]);

			this.logger?.debug(`sent permission request with buffer: ${requestBuffer.toHex()}`, LOG_TAG);

			await this.sendFeatureReport(requestBuffer);
			await delay(READ_PERMISSION_DELAY_MS);

			const responseBuffer = await this.transport.getFeatureReport(PERMISSION_COMMAND, RESPONSE_LENGTH);

			if (responseBuffer[1] !== PERMISSION_GRANTED_STATUS) {
				throw new DriverError(
					`Something went wrong, and the firmware did not enable reading of reportId: ${hex(reportId)}`,
					{ cause: responseBuffer },
				);
			}

			this.logger?.info(`permission granted by report id ${hex(reportId)}`, LOG_TAG);
			this.hasReadPermission = true;
		} catch (error) {
			if (error instanceof DriverError) {
				throw error;
			}
			throw new DriverError(`failed to request read permission: ${error}`, { cause: error });
		}
	}

	/**
	 * Retrieves a feature report from the device based on the specified report ID and report length.
	 *
	 * @param {ReportId} reportId - The ID of the report to be retrieved.
	 * @param {ReportReadLength} reportLengthRead - The length of the report to be read.
	 * @param {number} [parameter=0x01] - An optional parameter that may adjust the behavior of the request.
	 * @return {Promise<Uint8Array>} A promise that resolves to the feature report as a Uint8Array.
	 * @throws {DriverError} If the device is not opened before calling this method.
	 * @throws {ControlTransferError} If the control transfer operation for retrieving the feature report fails.
	 */
	async getFeatureReport(
		reportId: ReportId,
		reportLengthRead: ReportReadLength,
		parameter: number = 0x01,
	): Promise<Uint8Array> {
		if (!this.transport) throw new DriverError('You have to open the device first');

		try {
			if (!this.hasReadPermission) await this.requestReadPermission(reportId, reportLengthRead, parameter);

			this.logger?.info(
				`retrieving data for report id: ${hex(reportId)}, parameter: ${hex(parameter)}`,
				'AttackSharkX11-getFeatureReport',
			);

			const data: Uint8Array = await this.transport.getFeatureReport(reportId, reportLengthRead);

			this.logger?.info(
				`received buffer from report id ${hex(reportId)}: ${data.toHex()}`,
				'AttackSharkX11-getFeatureReport',
			);

			this.hasReadPermission = false;
			return data;
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
		if (!this.transport) throw new DriverError('You have to open the device first');

		this.on('batteryChange', listener);

		return () => {
			this.removeListener('batteryChange', listener);
		};
	}

	setPollingRate(rate: Rate | PollingRateBuilder, timeoutMs?: number): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		try {
			const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);
			return this.sendCommand(ReportId.POLLING_RATE, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set polling rate`, { cause: err });
		}
	}

	/**
	 *
	 * @param config
	 * @param timeoutMs
	 *
	 * @see ./docs/button-mapping.md
	 */
	setButtonMapping(
		config: ButtonMappingBuilderOptions | ButtonMappingBuilder,
		timeoutMs?: number,
	): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
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
		if (!this.transport) throw new DriverError('You have to open the device first');
		try {
			const builder = options instanceof LightingSettingsBuilder ? options : new LightingSettingsBuilder(options);
			return this.sendCommand(ReportId.LIGHTING_SETTINGS, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set lighting settings`, { cause: err });
		}
	}

	async setMacro(options: MacroBuilder | MacroBuilderOptions): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		try {
			const builder = options instanceof MacroBuilder ? options : new MacroBuilder(options);
			const buffers = builder.build(this.connectionMode);

			await this.sendCommand(ReportId.MACRO, buffers[0]);
			await this.sendCommand(ReportId.MACRO, buffers[1]);
			await this.sendCommand(ReportId.MACRO, buffers[2]);

			return CommandConfirmation.Success;
		} catch (err) {
			throw new SendCommandError(`failed to set macro`, { cause: err });
		}
	}

	sendInternalStateResetReportBuilder(): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = new ProfileSettingsBuilder();

		return this.sendCommand(ReportId.PROFILE, builder.build(this.connectionMode));
	}

	resetPollingRate(): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = new PollingRateBuilder();

		return this.sendCommand(ReportId.POLLING_RATE, builder.build(this.connectionMode));
	}

	setDpi(options: DpiBuilder | DpiBuilderOptions): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = options instanceof DpiBuilder ? options : new DpiBuilder(options);

		return this.sendCommand(ReportId.DPI, builder.build(this.connectionMode));
	}

	async getDpi(): Promise<DpiBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.DPI, ReportReadLength.DPI);

		return handleResponseDpi(response);
	}

	async getProfileSettings(): Promise<ProfileSettingsBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.PROFILE_SETTING, ReportReadLength.PROFILE_SETTING, 0x00);

		return handleProfileSettings(response);
	}

	async getButtonMapping(): Promise<ButtonMappingBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.BUTTON_MAPPING, ReportReadLength.BUTTON_MAPPING);

		return handleResponseButtonMapping(response);
	}

	async getMacro(macroId: number): Promise<MacroBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.MACRO, ReportReadLength.MACRO, macroId);

		return handleMacroResponse(response);
	}

	async getPollingRate(): Promise<Rate> {
		if (!this.transport) throw new DriverError('You have to open the device first');

		const response = await this.getFeatureReport(ReportId.POLLING_RATE, ReportReadLength.POLLING_RATE);

		return handleResponsePollingRate(response);
	}

	async getLightingSettings(): Promise<LightingSettingsBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.LIGHTING_SETTINGS, ReportReadLength.LIGHTING_SETTINGS);

		return handleResponseLightingSettings(response);
	}

	resetDpi(): Promise<number | undefined> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = new DpiBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetButtonMapping(): Promise<number | undefined> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = new ButtonMappingBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetLightingSettings(): Promise<number | undefined> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = new LightingSettingsBuilder().setKeyResponse(8);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Resets all device settings to factory defaults.
	 */
	async reset(): Promise<void> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		await this.sendInternalStateResetReportBuilder();
		await this.resetDpi();
		await this.resetLightingSettings();
		await this.resetPollingRate();
		await this.resetButtonMapping();
	}
}

export default AttackSharkX11;

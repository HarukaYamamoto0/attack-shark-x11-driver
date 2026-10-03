// noinspection JSUnusedGlobalSymbols

import { EventEmitter } from 'node:events';
import {
	CommandInProgressError,
	ControlTransferError,
	DriverError,
	ParamsError,
	SendCommandError,
	TimeoutError,
} from '../errors.js';
import { DpiBuilder, type DpiBuilderOptions } from '../protocols/DpiBuilder.js';
import { type ChangeProfileBuilderOptions, ProfileSettingsBuilder } from '../protocols/ProfileSettingsBuilder';
import {
	type ButtonMapping,
	ButtonMappingBuilder,
	type ButtonMappingBuilderOptions,
} from '../protocols/ButtonMappingBuilder';
import { PollingRateBuilder, type PollingRateBuilderOptions, type Rate } from '../protocols/PollingRateBuilder.js';
import { LightingSettingsBuilder, type LightingSettingsBuilderOptions } from '../protocols/LightingSettingsBuilder';
import {
	BatteryStatus,
	ConnectionMode,
	type Logger,
	MAX_PROFILES,
	MessageTypes,
	MessageTypesLength,
	type PendingCommand,
	Profile,
	type ProfileId,
	ReportId,
	ReportReadLength,
} from '../types.js';
import { FirmwareAction } from './keyboard-keypad-page';
import { SlotButton } from '../structures/SlotButton';
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
import { handleProfileChanged } from '../handles/messages/handleProfileChanged';

/**
 * The only reports the driver is allowed to write. Any write to report 0x10, whatever the payload, restarts the
 * X11 into its bootloader and leaves it stuck there, so anything that isn't a known report is refused.
 */
const WRITABLE_REPORTS: ReadonlySet<number> = new Set([
	ReportId.DPI,
	ReportId.LIGHTING_SETTINGS,
	ReportId.POLLING_RATE,
	ReportId.WAKE_UP_MODE,
	ReportId.BUTTON_MAPPING,
	ReportId.MACRO,
	ReportId.PROFILE,
	ReportId.DEVICE_VERSION,
	ReportId.PROFILE_SETTING,
	ReportId.READ_REPORT_ID,
]);

/** What one profile gets in {@link AttackSharkX11.setupProfiles}. Anything left out uses the driver's defaults. */
export interface ProfileSetup {
	dpi?: Omit<DpiBuilderOptions, 'profileId'>;
	lighting?: Omit<LightingSettingsBuilderOptions, 'profileId'>;
	pollingRate?: Rate;
	buttons?: Omit<ButtonMappingBuilderOptions, 'profileId'>;
}

/** Options for {@link AttackSharkX11.setupProfiles}. */
export interface SetupProfilesOptions {
	/** One entry per profile, 1 to 5 of them. Profile 1 is the first entry. */
	profiles: ProfileSetup[];
	/**
	 * The button that switches profiles. It gets the same action in every profile, because a profile without it
	 * is one you can't leave with the mouse alone. This overrides whatever `buttons` says for that slot.
	 */
	switchButton: ButtonMapping;
	/**
	 * What the switch button does, PROFILE_CYCLE by default. PROFILE_UP and PROFILE_DOWN don't wrap around, and
	 * PROFILE_DOWN can't get from profile 2 to profile 1 (off by one in the firmware).
	 */
	switchAction?: FirmwareAction.PROFILE_CYCLE | FirmwareAction.PROFILE_UP | FirmwareAction.PROFILE_DOWN;
	/** The profile that's active afterwards, profile 1 by default. */
	activeProfile?: Profile;
	timeoutMs?: number;
}

/** Which profile is active and how many are enabled, both counted from 1. */
export interface ProfileState {
	current: Profile;
	count: number;
}

/** Everything stored in one profile, from {@link AttackSharkX11.readProfile}. */
export interface ProfileContents {
	dpi: DpiBuilder;
	lighting: LightingSettingsBuilder;
	pollingRate: Rate;
	buttons: ButtonMappingBuilder;
}

/** Events emitted by the AttackSharkX11 class */
export interface AttackSharkX11Events {
	/** Emitted when the battery level changes */
	batteryChange: [status: BatteryStatus, percentage: number];
	/** Represents the confirmation details of a specific command execution. */
	commandConfirmation: [reportId: ReportId, success: boolean];
	profileChanged: [response: Profile];
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
								// most likely a late confirmation for an earlier command that already timed out,
								// so keep waiting for ours instead of failing a command that may be fine
								this.logger?.debug(
									`ignored a confirmation for report ${hex(response.reportId)} while waiting for ${hex(this.pendingCommand.reportId)}`,
									'AttackSharkX11-handleData',
								);
								return;
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
					case MessageTypes.PROFILE_CHANGED: {
						const TAG = 'AttackSharkX11-handleData-messages';

						try {
							const response = handleProfileChanged(params1, params2);

							this.emit('profileChanged', response);
						} catch (err) {
							this.logger?.error(`Error handling profile changed command: ${err}`, TAG);
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

		this.rejectPendingCommand(new DriverError('the device was closed before the command was confirmed'));
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
		// The caller only gets this promise once the report is sent. If it's rejected before that (the send
		// fails, the device is closed, the timeout fires first), nothing is listening yet and Node ends the
		// process with an unhandled rejection. Marking it handled here doesn't hide anything: the caller
		// still gets the rejection through the returned promise.
		promise.catch(() => undefined);

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
		if (!WRITABLE_REPORTS.has(buffer[0] ?? -1))
			throw new DriverError(`refusing to write report ${hex(buffer[0] ?? 0)}, it isn't one this driver knows`);

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

			return data;
		} catch (err) {
			throw new ControlTransferError('Control transfer (sendFeatureReport) failed', { cause: err });
		} finally {
			// a permission is good for one read only, so don't carry it over to the next one, even if this read failed
			this.hasReadPermission = false;
		}
	}

	setPollingRate(
		options: PollingRateBuilderOptions | PollingRateBuilder,
		timeoutMs?: number,
	): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		try {
			const builder = options instanceof PollingRateBuilder ? options : new PollingRateBuilder(options);
			return this.sendCommand(ReportId.POLLING_RATE, builder.build(this.connectionMode), timeoutMs);
		} catch (err) {
			throw new SendCommandError(`failed to set polling rate`, { cause: err });
		}
	}

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

	async setMacro(options: MacroBuilder | MacroBuilderOptions, timeoutMs?: number): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		try {
			const builder = options instanceof MacroBuilder ? options : new MacroBuilder(options);
			const buffers = builder.build(this.connectionMode);

			for (const buffer of buffers) {
				const confirmation = await this.sendCommand(ReportId.MACRO, buffer, timeoutMs);
				if (confirmation !== CommandConfirmation.Success) return confirmation;
			}

			return CommandConfirmation.Success;
		} catch (err) {
			throw new SendCommandError(`failed to set macro`, { cause: err });
		}
	}

	setProfileSettings(
		options: ChangeProfileBuilderOptions | ProfileSettingsBuilder,
		timeoutMs?: number,
	): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = options instanceof ProfileSettingsBuilder ? options : new ProfileSettingsBuilder(options);

		return this.sendCommand(ReportId.PROFILE_SETTING, builder.build(this.connectionMode), timeoutMs);
	}

	setDpi(options: DpiBuilder | DpiBuilderOptions, timeoutMs?: number): Promise<CommandConfirmation> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const builder = options instanceof DpiBuilder ? options : new DpiBuilder(options);

		return this.sendCommand(ReportId.DPI, builder.build(this.connectionMode), timeoutMs);
	}

	/** Reads the DPI settings of a profile (profile 1 unless you pass another one). */
	async getDpi(profileId: ProfileId = 0x01): Promise<DpiBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.DPI, ReportReadLength.DPI, profileId);

		return handleResponseDpi(response);
	}

	async getProfileSettings(): Promise<ProfileSettingsBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.PROFILE_SETTING, ReportReadLength.PROFILE_SETTING, 0x00);

		return handleProfileSettings(response);
	}

	async getButtonMapping(profileId: ProfileId = 0x01): Promise<ButtonMappingBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(
			ReportId.BUTTON_MAPPING,
			ReportReadLength.BUTTON_MAPPING,
			profileId,
		);

		return handleResponseButtonMapping(response);
	}

	async getMacro(macroId: number): Promise<MacroBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(ReportId.MACRO, ReportReadLength.MACRO, macroId);

		return handleMacroResponse(response);
	}

	/** Reads the polling rate of a profile (profile 1 unless you pass another one). */
	async getPollingRate(profileId: ProfileId = 0x01): Promise<Rate> {
		if (!this.transport) throw new DriverError('You have to open the device first');

		const response = await this.getFeatureReport(ReportId.POLLING_RATE, ReportReadLength.POLLING_RATE, profileId);

		return handleResponsePollingRate(response);
	}

	/** Reads the lighting settings of a profile (profile 1 unless you pass another one). */
	async getLightingSettings(profileId: ProfileId = 0x01): Promise<LightingSettingsBuilder> {
		if (!this.transport) throw new DriverError('You have to open the device first');
		const response = await this.getFeatureReport(
			ReportId.LIGHTING_SETTINGS,
			ReportReadLength.LIGHTING_SETTINGS,
			profileId,
		);

		return handleResponseLightingSettings(response);
	}

	/**
	 * Initializes the user profile with specified configuration settings.
	 *
	 * @param {Object} config - Configuration settings for initializing the profile.
	 * @param {ProfileId} config.profileId - Identifier of the profile to initialize.
	 * @param {number} config.currentProfileId - Identifier of the currently active profile.
	 * @param {number} config.maxProfileCount - Maximum number of profiles allowed.
	 * @param {number} config.timeoutMs - Timeout duration in milliseconds for each configuration operation.
	 * @return {Promise<void>} A promise that resolves when the profile initialization is complete.
	 */
	async initializeProfile(config: {
		profileId: ProfileId;
		currentProfileId: number;
		maxProfileCount: number;
		timeoutMs: number;
	}): Promise<void> {
		const check = (what: string, confirmation: CommandConfirmation): void => {
			if (confirmation !== CommandConfirmation.Success)
				throw new SendCommandError(
					`the mouse rejected the ${what} while initializing profile ${config.profileId}`,
				);
		};

		check(
			'profile settings',
			await this.setProfileSettings(
				{
					currentProfileId: config.currentProfileId,
					maxProfileCount: config.maxProfileCount,
				},
				config.timeoutMs,
			),
		);
		check('DPI settings', await this.setDpi({ profileId: config.profileId }, config.timeoutMs));
		check('lighting settings', await this.setLightingSettings({ profileId: config.profileId }, config.timeoutMs));
		check('polling rate', await this.setPollingRate({ profileId: config.profileId }, config.timeoutMs));
		check('button mapping', await this.setButtonMapping({ profileId: config.profileId }, config.timeoutMs));
	}

	/** Reads which profile is active and how many profiles are enabled. */
	async getProfileState(): Promise<ProfileState> {
		const settings = await this.getProfileSettings();

		return { current: settings.getCurrentProfile(), count: settings.getMaxProfileCount() };
	}

	/**
	 * Makes `profile` the active one and keeps the number of enabled profiles.
	 *
	 * Switching this way doesn't make the mouse send its profile changed (0x80) event, that only comes when a
	 * button switches profiles.
	 */
	async switchProfile(profile: Profile, timeoutMs?: number): Promise<CommandConfirmation> {
		const { count } = await this.getProfileState();
		if (!Number.isInteger(profile) || profile < 1 || profile > count)
			throw new ParamsError('profile', `profile ${profile} isn't enabled, only 1 to ${count} are`);

		return this.setProfileSettings({ currentProfileId: profile, maxProfileCount: count }, timeoutMs);
	}

	/** Switches to the next enabled profile, from the last one back to profile 1. Returns the new profile. */
	nextProfile(timeoutMs?: number): Promise<Profile> {
		return this.stepProfile(1, timeoutMs);
	}

	/**
	 * Switches to the previous enabled profile, from profile 1 to the last one. Returns the new profile.
	 *
	 * The driver does this itself because the firmware's PROFILE_DOWN button action can't get from profile 2 to
	 * profile 1 (off by one in the firmware) and doesn't wrap.
	 */
	previousProfile(timeoutMs?: number): Promise<Profile> {
		return this.stepProfile(-1, timeoutMs);
	}

	private async stepProfile(step: 1 | -1, timeoutMs?: number): Promise<Profile> {
		const { current, count } = await this.getProfileState();
		const target = ((((current - 1 + step) % count) + count) % count) + 1;

		const confirmation = await this.setProfileSettings(
			{ currentProfileId: target, maxProfileCount: count },
			timeoutMs,
		);
		if (confirmation !== CommandConfirmation.Success)
			throw new SendCommandError(`the mouse rejected the switch to profile ${target}`);

		return target as Profile;
	}

	/**
	 * Sets how many profiles are enabled, 1 to 5 (5 is the firmware's limit). If the active profile is past the new
	 * count, the last enabled profile becomes the active one.
	 */
	async setProfileCount(count: number, timeoutMs?: number): Promise<CommandConfirmation> {
		if (!Number.isInteger(count) || count < 1 || count > MAX_PROFILES)
			throw new ParamsError('count', `expected 1 to ${MAX_PROFILES} profiles, got ${count}`);

		const { current } = await this.getProfileState();

		return this.setProfileSettings(
			{ currentProfileId: Math.min(current, count), maxProfileCount: count },
			timeoutMs,
		);
	}

	/**
	 * Reads everything stored in one profile, whether it's the active one or not.
	 *
	 * The button table comes back in the mouse's read order (see docs/protocols/button-mapping.md), so check that
	 * before writing it back unchanged.
	 */
	async readProfile(profile: Profile): Promise<ProfileContents> {
		return {
			dpi: await this.getDpi(profile),
			lighting: await this.getLightingSettings(profile),
			pollingRate: await this.getPollingRate(profile),
			buttons: await this.getButtonMapping(profile),
		};
	}

	/**
	 * Sets up the mouse's onboard profiles in one go: writes all the settings of every profile, puts the profile
	 * switch on the same button in each of them, then enables that many profiles and picks the active one.
	 *
	 * Every profile is written in full and nothing is read first. A profile that was never written loads the
	 * firmware's built-in defaults, which have no profile switch button, so you'd be stuck on it.
	 */
	async setupProfiles(options: SetupProfilesOptions): Promise<void> {
		const { profiles, switchButton, timeoutMs } = options;
		const switchAction = options.switchAction ?? FirmwareAction.PROFILE_CYCLE;
		const activeProfile = options.activeProfile ?? Profile.Profile1;

		if (profiles.length < 1 || profiles.length > MAX_PROFILES)
			throw new ParamsError('profiles', `expected 1 to ${MAX_PROFILES} profiles, got ${profiles.length}`);
		if (!Number.isInteger(activeProfile) || activeProfile < 1 || activeProfile > profiles.length)
			throw new ParamsError(
				'activeProfile',
				`profile ${activeProfile} isn't one of the ${profiles.length} set up`,
			);

		const check = (what: string, profile: number, confirmation: CommandConfirmation): void => {
			if (confirmation !== CommandConfirmation.Success)
				throw new SendCommandError(`the mouse rejected the ${what} of profile ${profile}`);
		};

		for (const [index, setup] of profiles.entries()) {
			const profileId = index + 1;
			const rate = setup.pollingRate === undefined ? {} : { rate: setup.pollingRate };
			const buttons = new ButtonMappingBuilder({ ...setup.buttons, profileId }).setButton(
				switchButton,
				new SlotButton(switchAction, 0x00, 0x00),
			);

			check('DPI settings', profileId, await this.setDpi({ ...setup.dpi, profileId }, timeoutMs));
			check('lighting', profileId, await this.setLightingSettings({ ...setup.lighting, profileId }, timeoutMs));
			check('polling rate', profileId, await this.setPollingRate({ ...rate, profileId }, timeoutMs));
			check('button mapping', profileId, await this.setButtonMapping(buttons, timeoutMs));
		}

		const confirmation = await this.setProfileSettings(
			{ currentProfileId: activeProfile, maxProfileCount: profiles.length },
			timeoutMs,
		);
		if (confirmation !== CommandConfirmation.Success)
			throw new SendCommandError('the mouse rejected the profile count and active profile');
	}
}

export default AttackSharkX11;

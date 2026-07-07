// noinspection JSUnusedGlobalSymbols

import * as HID from 'node-hid';
import { HIDAsync } from 'node-hid';
import { EventEmitter } from 'node:events';
import { ControlTransferError, DeviceError, DriverError, TimeoutError } from '../errors.js';
import { CustomMacroBuilder, type CustomMacroBuilderOptions, MacroMode } from '../protocols/CustomMacroBuilder.js';
import { DpiBuilder, type DpiBuilderOptions } from '../protocols/DpiBuilder.js';
import { ChangeProfileBuilder } from '../protocols/ChangeProfileBuilder';
import { type MacroBuilderOptions, MacrosBuilder } from '../protocols/MacrosBuilder.js';
import { PollingRateBuilder, type Rate } from '../protocols/PollingRateBuilder.js';
import { LightingSettingsBuilder, type LightingSettingsBuilderOptions } from '../protocols/LightingSettingsBuilder';
import { Button, ConnectionMode, type Logger, PacketLength, ReportId, type Option, type Result } from '../types.js';
import { bufferStartsWith } from '../utils/bufferUtils.js';
import { ConsoleLogger } from '../logger';
import { delay } from '../utils/delay.js';
import { handleResponsePollingRate } from '../handles/handleResponsePollingRate';
import { handleResponseLightingSettings } from '../handles/handleResponseLightingSettings';
import { handleResponseDpi } from '../handles/handleResponseDpi';

const VID = 0x1d57;
const DEVICE_INTERFACE = 2;

/**
 * Events emitted by the AttackSharkX11 class.
 */
export interface AttackSharkX11Events {
	/** Emitted when the battery level changes */
	batteryChange: [battery: number];
	/** Emitted when a data monitoring error occurs */
	error: [error: Error];
}

/**
 * Main driver for the Attack Shark X11 mouse.
 * This class manages the USB connection, DPI settings, polling rate, macros, and user preferences.
 *
 * @example
 * ```TypeScript
 * const driver = new AttackSharkX11({ connectionMode: ConnectionMode.Adapter });
 * await driver.open();
 * const battery = await driver.getBatteryLevel();
 * console.log(`Battery: ${battery}%`);
 * await driver.close();
 * ```
 */
export class AttackSharkX11 extends EventEmitter<AttackSharkX11Events> {
	public readonly productId: number;
	private devicePath?: string;
	public hidDevice?: HIDAsync;
	/**
	 * Delay in milliseconds between packets to prevent the device from locking up.
	 */
	public readonly delayMs: number;
	private isOpen: boolean = false;
	private lastBattery: number = -1;
	private logger: Logger;

	/**
	 * @param options Configuration options for the driver
	 * @param options.connectionMode Connection mode (Wired or Adapter)
	 * @param options.logger Optional custom logger
	 * @param options.delayMs Optional delay in milliseconds between packets to prevent lock-up (default: 250)
	 */
	constructor(options: { connectionMode: ConnectionMode; logger?: Logger; delayMs?: number }) {
		super();
		if (!options.connectionMode) {
			throw new DriverError('The type of connection was not specified');
		}

		this.logger = options.logger ?? new ConsoleLogger();
		this.delayMs = options.delayMs ?? 250;

		// const devices = HID.devices();
		// const deviceInfo = devices.find(
		// 	(d) => d.vendorId === VID && d.productId === options.connectionMode && d.interface === DEVICE_INTERFACE,
		// );
		//
		// if (!deviceInfo || !deviceInfo.path) {
		// 	throw new DeviceError(
		// 		`Device with idProduct ${options.connectionMode} and interface ${DEVICE_INTERFACE} not found`,
		// 	);
		// }
		//
		// this.devicePath = deviceInfo.path;
		this.productId = options.connectionMode;
	}

	/**
	 * Returns to the current connection mode.
	 */
	get connectionMode(): ConnectionMode {
		return this.productId as ConnectionMode;
	}

	async open(): Promise<void> {
		try {
			const devices = await HID.devicesAsync();
			const deviceInfo = devices.find(
				(d) => d.vendorId === VID && d.productId === this.connectionMode && d.interface === DEVICE_INTERFACE,
			);

			if (!deviceInfo || !deviceInfo.path) {
				// noinspection ExceptionCaughtLocallyJS
				throw new DriverError(`Device with idProduct ${this.connectionMode} not found`);
			}

			this.devicePath = deviceInfo.path;
			this.hidDevice = await HIDAsync.open(this.devicePath);
		} catch (e: unknown) {
			new DeviceError(`An unexpected error occurred while trying to open device ${this.connectionMode}`, {
				cause: e,
			});
		}

		this.setupListeners();
		this.isOpen = true;
	}

	private setupListeners(): void {
		if (!this.hidDevice) return;

		this.hidDevice.on('error', (err: Error) => {
			// Suppress "could not read" errors if they are expected on some Windows HID collections
			if (err.message.includes('could not read')) {
				this.logger.debug('Suppressed HID read error:', err.message);
				return;
			}
			this.emit('error', err);
		});

		this.on('newListener', (event) => {
			if (event === 'batteryChange' && this.listenerCount('batteryChange') === 0) {
				this.hidDevice?.on('data', this.handleData);
				this.startPolling();
			}
		});

		this.on('removeListener', (event) => {
			if (event === 'batteryChange' && this.listenerCount('batteryChange') === 0) {
				this.stopPolling();
				this.hidDevice?.removeListener('data', this.handleData);
			}
		});
	}

	private handleData = (data: Buffer): void => {
		if (bufferStartsWith(data, Buffer.from([0x03, 0x55, 0x40, 0x01]))) {
			if (data.length < 5) return;
			const battery = data[4];
			if (battery !== undefined && battery !== this.lastBattery) {
				this.lastBattery = battery;
				this.emit('batteryChange', battery);
			}
		}
	};

	private startPolling(): void {
		if (!this.isOpen || !this.hidDevice) return;
		try {
			this.hidDevice.resume();
		} catch (e) {
			this.logger.error('Failed to start polling', e);
		}
	}

	private stopPolling(): void {
		if (!this.hidDevice) return;
		try {
			this.hidDevice.pause();
		} catch {
			/* empty */
		}
	}

	/**
	 * Closes the connection to the device, stops polling, and releases the interfaces.
	 * It is important to call this method when finishing use to avoid resource leaks.
	 */
	async close(): Promise<void> {
		if (!this.isOpen) return;

		this.removeAllListeners();

		try {
			await this.hidDevice?.close();
		} catch {
			/* empty */
		}

		this.isOpen = false;
	}

	checkIsOpen(): void {
		if (!this.isOpen || !this.hidDevice) throw new DriverError('You have to open the device first');
	}

	async sendFeatureReport(buffer: Buffer): Promise<number | undefined> {
		this.checkIsOpen();

		try {
			return await this.hidDevice?.sendFeatureReport(buffer);
		} catch (err) {
			throw new ControlTransferError('Control transfer (sendFeatureReport) failed', { cause: err });
		}
	}

	async getFeatureReport(reportId: ReportId, report_length: PacketLength): Promise<Result<Uint8Array, number>> {
		if (!this.isOpen || !this.hidDevice) throw new DriverError('You have to open the device first');

		try {
			await this.sendFeatureReport(Buffer.from([0xa0, reportId, report_length, 0x01, 0x00, 0x00, 0x00, 0x00]));

			await delay(250);

			const checkStatus = await this.hidDevice?.getFeatureReport(0xa0, 8); // status check

			if (checkStatus && checkStatus?.[1] !== 0x01) {
				throw new DriverError(
					`Something went wrong, and the firmware did not enable reading of reportId: ${reportId.toString(16).padStart(2, '0')}`,
				);
			}

			const data: Buffer = await this.hidDevice.getFeatureReport(reportId, report_length);
			if (data) return Uint8Array.fromHex(data.toHex());
			else return -1;
		} catch (err) {
			throw new ControlTransferError('Control transfer (sendFeatureReport) failed', { cause: err });
		}
	}

	// async controlTransfer(options: ControlTransferOptions): Promise<number | Buffer> {
	// 	this.checkIsOpen();
	//
	// 	const reportId = options.wValue & 0xff;
	//
	// 	if (Buffer.isBuffer(options.data)) {
	// 		// Output Transfer (Feature Report)
	// 		const dataWithReportId = Buffer.concat([Buffer.from([reportId]), options.data]);
	//
	// 		try {
	// 			await this.hidDevice?.sendFeatureReport(dataWithReportId);
	// 		} catch (err) {
	// 			throw new ControlTransferError('Control transfer (sendFeatureReport) failed', { cause: err });
	// 		}
	//
	// 		await delay(this.delayMs);
	// 		return dataWithReportId.length;
	// 	} else {
	// 		// Input Transfer (Feature Report)
	// 		try {
	// 			// We add 1 to the size because node-hid includes the report ID in the returned buffer
	// 			const res: Buffer | undefined = await this.hidDevice?.getFeatureReport(reportId, options.data + 1);
	// 			if (res) return Buffer.from(res).subarray(1);
	// 			else return -1;
	// 		} catch (err) {
	// 			throw new ControlTransferError('Control transfer (getFeatureReport) failed', { cause: err });
	// 		}
	// 	}
	// }

	/**
	 * Gets the current battery level of the mouse.
	 * Note that the value is only returned if the mouse is in wireless mode (Adapter).
	 * In Wired mode, it returns -1.
	 *
	 * @param timeoutMs Maximum time to wait for the device response (default: 1000ms).
	 * @throws {TimeoutError} If the device does not respond within the specified time.
	 * @returns The battery level in percentage (0-100) or -1 if unavailable.
	 */
	getBatteryLevel(timeoutMs = 1000): Promise<number> {
		this.checkIsOpen();

		return new Promise((resolve, reject) => {
			if (this.connectionMode === ConnectionMode.Wired) {
				return resolve(-1); // -1 indicates that it was not possible to get the exact battery status value
			}

			let finished = false;

			const cleanup = (): void => {
				if (finished) return;
				finished = true;

				clearTimeout(timeout);
				this.removeListener('batteryChange', handleBattery);
			};

			const handleBattery = (battery: number): void => {
				if (finished) return;
				if (battery <= 100) {
					cleanup();
					resolve(battery);
				}
			};

			const timeout = setTimeout(() => {
				cleanup();
				reject(new TimeoutError('Timeout waiting for battery report'));
			}, timeoutMs);

			this.on('batteryChange', handleBattery);

			if (this.lastBattery !== -1 && this.lastBattery <= 100) {
				cleanup();
				resolve(this.lastBattery);
			}
		});
	}

	onBatteryChange(listener: (battery: number) => void): () => void {
		this.checkIsOpen();

		this.on('batteryChange', listener);

		return () => {
			this.removeListener('batteryChange', listener);
		};
	}

	/**
	 * Sets the polling rate of the mouse.
	 *
	 * @param rate A value from the Rate enum or a PollingRateBuilder instance.
	 * @returns The result of the USB control transfer.
	 *
	 * @example
	 * ```TypeScript
	 * await driver.setPollingRate(Rate.eSports); // 1000Hz
	 * ```
	 */
	setPollingRate(rate: Rate | PollingRateBuilder): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Configures an advanced custom macro with multiple events and repetitions.
	 *
	 * @param options CustomMacroBuilder instance or configuration options.
	 *
	 * @example
	 * ```TypeScript
	 * const builder = new CustomMacroBuilder()
	 *   .setPlayOptions(MacroMode.THE_NUMBER_OF_TIME_TO_PLAY, 5)
	 *   .setTargetButton(Button.BACKWARD, macroBuilder)
	 *   .addEvent(KeyCode.A)
	 *   .addEvent(KeyCode.A, 10, true); // Release key A after 10ms
	 * await driver.setCustomMacro(builder);
	 * ```
	 */
	async setCustomMacro(
		options: CustomMacroBuilder | CustomMacroBuilderOptions,
	): Promise<[number | undefined, number | undefined, number | undefined, number | undefined]> {
		this.checkIsOpen();
		const builder = options instanceof CustomMacroBuilder ? options : new CustomMacroBuilder(options);
		const [setMacroBuffer, secondPacket, thirdPacket, fourthPacket] = builder.build(this.connectionMode);

		const responseMacros = await this.sendFeatureReport(setMacroBuffer);
		await delay(this.delayMs);

		const responseSecondPacket = await this.sendFeatureReport(secondPacket);
		await delay(this.delayMs);

		const responseThirdPacket = await this.sendFeatureReport(thirdPacket);
		await delay(this.delayMs);

		const responseFourthPacket = await this.sendFeatureReport(fourthPacket);

		return [responseMacros, responseSecondPacket, responseThirdPacket, responseFourthPacket];
	}

	/**
	 * Maps mouse buttons to simple macros or keyboard functions.
	 *
	 * @param config MacrosBuilder instance or mapping options.
	 *
	 * @example
	 * ```TypeScript
	 * const macroBuilder = new MacrosBuilder().setMacro(Button.DPI, macroTemplates[MacroName.SHORTCUT_SWAP_WINDOW]);
	 * await driver.setMacro(macroBuilder);
	 * ```
	 */
	setMacro(config: MacroBuilderOptions | MacrosBuilder): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = config instanceof MacrosBuilder ? config : new MacrosBuilder(config);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Sets user preferences, such as lighting, key response time, and sleep timers.
	 *
	 * @param options UserPreferencesBuilder instance or configuration options.
	 *
	 * @example
	 * ```TypeScript
	 * await driver.setUserPreferences({
	 *   lightMode: LightMode.Neon,
	 *   ledSpeed: 5,
	 *   keyResponse: 4
	 * });
	 * ```
	 */
	setLightingSettings(
		options: LightingSettingsBuilder | LightingSettingsBuilderOptions,
	): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = options instanceof LightingSettingsBuilder ? options : new LightingSettingsBuilder(options);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	sendInternalStateResetReportBuilder(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new ChangeProfileBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetPollingRate(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new PollingRateBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Configures the DPI stages and values for the mouse.
	 *
	 * @param options DpiBuilder instance or configuration options.
	 * @returns The result of the USB control transfer.
	 *
	 * @example
	 * ```TypeScript
	 * const dpiBuilder = new DpiBuilder({
	 *   dpiValues: [800, 1600, 2400, 3200, 5000, 22000],
	 *   activeStage: 2
	 * });
	 * await driver.setDpi(dpiBuilder);
	 * ```
	 */
	setDpi(options: DpiBuilder | DpiBuilderOptions): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = options instanceof DpiBuilder ? options : new DpiBuilder(options);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	async getDpi(): Promise<Option<DpiBuilder>> {
		const response = await this.getFeatureReport(ReportId.DPI, PacketLength.DPI);
		if (typeof response === 'number') return null;

		return handleResponseDpi(Uint8Array.fromHex(response.toHex()));
	}

	async getPollingRate(): Promise<Option<Rate>> {
		const response = await this.getFeatureReport(ReportId.POLLING_RATE, PacketLength.POLLING_RATE);
		if (typeof response === 'number') return null;

		return handleResponsePollingRate(Uint8Array.fromHex(response.toHex()));
	}

	async getLightingSettings(): Promise<Option<LightingSettingsBuilder>> {
		const response = await this.getFeatureReport(ReportId.LIGHTING_SETTINGS, PacketLength.LIGHTING_SETTINGS);
		if (typeof response === 'number') return null;

		return handleResponseLightingSettings(Uint8Array.fromHex(response.toHex()));
	}

	resetDpi(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new DpiBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetMacro(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new MacrosBuilder();

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	resetCustomMacro(): Promise<[number | undefined, number | undefined, number | undefined, number | undefined]> {
		this.checkIsOpen();
		const builder = new CustomMacroBuilder({
			playOptions: {
				mode: MacroMode.THE_NUMBER_OF_TIME_TO_PLAY,
				times: 1,
			},
			targetButton: Button.BACKWARD,
			macroEvents: [],
		});

		return this.setCustomMacro(builder);
	}

	resetUserPreferences(): Promise<number | undefined> {
		this.checkIsOpen();
		const builder = new LightingSettingsBuilder().setKeyResponse(8);

		return this.sendFeatureReport(builder.build(this.connectionMode));
	}

	/**
	 * Resets the mouse to factory settings (all profiles and definitions).
	 *
	 * @returns A promise that resolves when the reset is complete.
	 */
	async reset(): Promise<void> {
		this.checkIsOpen();
		await this.sendInternalStateResetReportBuilder();
		await this.resetDpi();
		await this.resetUserPreferences();
		await this.resetPollingRate();
		await this.resetMacro();
		await this.resetCustomMacro();
	}
}

export default AttackSharkX11;

// noinspection JSUnusedGlobalSymbols

// import type { Device, InEndpoint, Interface } from 'usb';
// import * as usb from 'usb';
import { EventEmitter } from 'node:events';
import { DeviceError, DriverError, TimeoutError } from '../errors.js';
import { CustomMacroBuilder, type CustomMacroBuilderOptions, MacroMode } from '../protocols/CustomMacroBuilder.js';
import { DpiBuilder, type DpiBuilderOptions } from '../protocols/DpiBuilder.js';
import { InternalStateResetReportBuilder } from '../protocols/InternalStateResetReportBuilder.js';
import { type MacroBuilderOptions, MacrosBuilder } from '../protocols/MacrosBuilder.js';
import { PollingRateBuilder, type Rate } from '../protocols/PollingRateBuilder.js';
import { UserPreferencesBuilder, type UserPreferencesBuilderOptions } from '../protocols/UserPreferencesBuilder.js';
import { Button, ConnectionMode, type Logger, PacketLength, ReportId } from '../types.js';
import { ConsoleLogger } from '../logger/index.js';
import HID, { HIDAsync } from 'node-hid';
import { delay } from '../utils/delay.ts';
import { handleLightingSettingsResponse, LightSettingsBuilder } from '../utils/handleLightingSettingsResponse.ts';

const VID = 0x1d57;

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
	private productId: ConnectionMode;
	device!: HIDAsync;
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

		this.productId = options.connectionMode;
		this.logger = options.logger ?? new ConsoleLogger();
		this.delayMs = options.delayMs ?? 250;
	}

	/**
	 * Returns to the current connection mode.
	 */
	get connectionMode(): ConnectionMode {
		return this.productId as ConnectionMode;
	}

	/**
	 * Opens the connection to the device and configures the necessary interfaces.
	 * Claims the USB interface and sets up interrupt listeners.
	 *
	 * @throws {DeviceError} If an error occurs while opening the device.
	 * @throws {InterfaceError} If the required interface is not found or cannot be claimed.
	 * @returns A promise that resolves when the device is ready.
	 */
	open(): Promise<void> {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve, reject) => {
			try {
				const devices = await HID.devicesAsync();
				const info = devices.find((d) => d.vendorId === VID && d.productId === this.connectionMode && d.interface === 2);

				if (!info) {
					throw new DeviceError(`Device with idProduct ${this.connectionMode} not found`);
				}
				this.productId = info.productId;
				console.log(info.path);
				this.device = await HIDAsync.open(info.path);
			} catch (e: unknown) {
				reject(
					new DeviceError(`An unexpected error occurred while trying to open device ${this.connectionMode}`, {
						cause: e,
					}),
				);
			}

			this.setupListeners();
			this.isOpen = true;
			resolve(true);
		});
	}

	private setupListeners(): void {
		this.device.on('data', (data: Buffer) => {
			console.log(data.toHex());
		});
		this.device.on('error', (err) => {
			console.error(err);
		});
	}

	/**
	 * Closes the connection to the device, stops polling, and releases the interfaces.
	 * It is important to call this method when finishing use to avoid resource leaks.
	 */
	async close(): Promise<void> {
		if (!this.isOpen) return;

		this.removeAllListeners();

		await this.device?.close();
		this.isOpen = false;
	}

	checkIsOpen(): void {
		if (!this.isOpen) throw new DriverError('You have to open the device first');
	}

	controlTransfer(message: Buffer): Promise<number> {
		this.checkIsOpen();

		return this.device.sendFeatureReport(message);
	}

	async getFeatureReport(reportId: number, payloadSize: number): Promise<Buffer> {
		this.checkIsOpen();

		await this.controlTransfer(Buffer.from([0xa0, reportId, payloadSize, 0x00, 0x01, 0x00, 0x00, 0x00]));

		await delay(250);

		await this.device.getFeatureReport(0xa0, 8); // status check

		return this.device.getFeatureReport(reportId, payloadSize);
	}

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
	setPollingRate(rate: Rate | PollingRateBuilder): Promise<number> {
		this.checkIsOpen();
		const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);

		return this.controlTransfer(builder.build(this.connectionMode));
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
	async setCustomMacro(options: CustomMacroBuilder | CustomMacroBuilderOptions): Promise<void> {
		this.checkIsOpen();
		const builder = options instanceof CustomMacroBuilder ? options : new CustomMacroBuilder(options);
		const [setMacroBuffer, secondPacket, thirdPacket, fourthPacket] = builder.build(this.connectionMode);

		await this.controlTransfer(setMacroBuffer);

		await this.controlTransfer(secondPacket);

		await this.controlTransfer(thirdPacket);

		await this.controlTransfer(fourthPacket);
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
	setMacro(config: MacroBuilderOptions | MacrosBuilder): Promise<number> {
		this.checkIsOpen();
		const builder = config instanceof MacrosBuilder ? config : new MacrosBuilder(config);

		return this.controlTransfer(builder.build(this.connectionMode));
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
	setUserPreferences(options: UserPreferencesBuilder | UserPreferencesBuilderOptions): Promise<number> {
		this.checkIsOpen();
		const builder = options instanceof UserPreferencesBuilder ? options : new UserPreferencesBuilder(options);

		return this.controlTransfer(builder.build(this.connectionMode));
	}

	sendInternalStateResetReportBuilder(): Promise<number> {
		this.checkIsOpen();
		const builder = new InternalStateResetReportBuilder();

		return this.controlTransfer(builder.build(this.connectionMode));
	}

	resetPollingRate(): Promise<number> {
		this.checkIsOpen();
		const builder = new PollingRateBuilder();

		return this.controlTransfer(builder.build(this.connectionMode));
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
	setDpi(options: DpiBuilder | DpiBuilderOptions): Promise<number> {
		this.checkIsOpen();
		const builder = options instanceof DpiBuilder ? options : new DpiBuilder(options);

		return this.controlTransfer(builder.build(this.connectionMode));
	}

	/**
	 * Reads the current DPI configuration from the device.
	 *
	 * @returns Raw buffer. Parse with DpiBuilder when decoding is needed.
	 *
	 * @example
	 * ```TypeScript
	 * const raw = await driver.getDpi();
	 * console.log(raw.toString('hex'));
	 * ```
	 */
	getDpi(): Promise<Buffer> {
		this.checkIsOpen();
		return this.getFeatureReport(0x04, this.connectionMode === ConnectionMode.Wired ? 0x38 : 0x34);
	}

	/**
	 * Reads the current user preferences from the device (lighting, sleep timers, debounce).
	 *
	 * @returns Raw 64-byte buffer. Parse with UserPreferencesBuilder when decoding is needed.
	 *
	 * @example
	 * ```TypeScript
	 * const raw = await driver.getUserPreferences();
	 * console.log(raw.toString('hex'));
	 * ```
	 */
	async getLightSettings(): Promise<LightSettingsBuilder> {
		this.checkIsOpen();
		const response = await this.getFeatureReport(ReportId.LIGHTING_SETTINGS, PacketLength.LIGHTING_SETTINGS);
		return handleLightingSettingsResponse(Uint8Array.from(response));
	}

	/**
	 * Reads the current polling rate from the device.
	 *
	 * @returns Raw 64-byte buffer. Parse with PollingRateBuilder when decoding is needed.
	 *
	 * @example
	 * ```TypeScript
	 * const raw = await driver.getPollingRate();
	 * console.log(raw.toString('hex'));
	 * ```
	 */
	// getPollingRate(): Promise<Buffer> {
	// 	this.checkIsOpen();
	// 	return this.getReport(0x06, 0x09);
	// }

	/**
	 * Reads the current button mapping from the device.
	 *
	 * @returns Raw 64-byte buffer. Parse with MacrosBuilder when decoding is needed.
	 *
	 * @example
	 * ```TypeScript
	 * const raw = await driver.getButtons();
	 * console.log(raw.toString('hex'));
	 * ```
	 */
	// getButtons(): Promise<Buffer> {
	// 	this.checkIsOpen();
	// 	return this.getReport(0x08, 0x3b);
	// }

	resetDpi(): Promise<number> {
		this.checkIsOpen();
		const builder = new DpiBuilder();

		return this.controlTransfer(builder.build(this.connectionMode));
	}

	resetMacro(): Promise<number> {
		this.checkIsOpen();
		const builder = new MacrosBuilder();

		return this.controlTransfer(builder.build(this.connectionMode));
	}

	async resetCustomMacro(): Promise<void> {
		this.checkIsOpen();
		const builder = new CustomMacroBuilder({
			playOptions: {
				mode: MacroMode.THE_NUMBER_OF_TIME_TO_PLAY,
				times: 1,
			},
			targetButton: Button.BACKWARD,
			macroEvents: [],
		});

		await this.setCustomMacro(builder);
	}

	resetUserPreferences(): Promise<number> {
		this.checkIsOpen();
		const builder = new UserPreferencesBuilder().setKeyResponse(8);

		return this.controlTransfer(builder.build(this.connectionMode));
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

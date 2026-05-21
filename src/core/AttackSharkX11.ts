// noinspection JSUnusedGlobalSymbols

import type { Device, InEndpoint, Interface } from 'usb';
import * as usb from 'usb';
import { EventEmitter } from 'node:events';
import { ControlTransferError, DeviceError, DriverError, InterfaceError, TimeoutError } from '../errors.js';
import { CustomMacroBuilder, type CustomMacroBuilderOptions, MacroMode } from '../protocols/CustomMacroBuilder.js';
import { DpiBuilder, type DpiBuilderOptions } from '../protocols/DpiBuilder.js';
import { InternalStateResetReportBuilder } from '../protocols/InternalStateResetReportBuilder.js';
import { type MacroBuilderOptions, MacrosBuilder } from '../protocols/MacrosBuilder.js';
import { PollingRateBuilder, type Rate } from '../protocols/PollingRateBuilder.js';
import { UserPreferencesBuilder, type UserPreferencesBuilderOptions } from '../protocols/UserPreferencesBuilder.js';
import { Button, ConnectionMode, type ControlTransferOptions, type ControlTransferOut, type Logger } from '../types.js';
import { bufferStartsWith } from '../utils/bufferUtils.js';
import { delay } from '../utils/delay.js';
import { ConsoleLogger } from '../logger/index.js';

const VID = 0x1d57;
const DEVICE_INTERFACE = 0x02;
const INTERRUPT_ENDPOINT = 0x83;

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
	device: Device;
	deviceInterface!: Interface;
	interruptEndpoint!: InEndpoint;
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

		const device = usb
			.getDeviceList()
			.find(
				(d) => d.deviceDescriptor.idVendor === VID && d.deviceDescriptor.idProduct === options.connectionMode,
			);

		if (!device) {
			throw new DeviceError(`Device with idProduct ${options.connectionMode} not found`);
		}

		this.device = device;
		this.productId = device.deviceDescriptor.idProduct;
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
	open(): Promise<unknown> {
		return new Promise((resolve, reject) => {
			try {
				this.device.open();
			} catch (e: unknown) {
				reject(
					new DeviceError(`An unexpected error occurred while trying to open device ${this.connectionMode}`, {
						cause: e,
					}),
				);
			}

			const iface = this.device.interface(DEVICE_INTERFACE);

			if (!iface) {
				reject(new InterfaceError(`interface ${DEVICE_INTERFACE} not found`, DEVICE_INTERFACE));
			}

			this.deviceInterface = iface;

			try {
				if (iface.isKernelDriverActive()) {
					iface.detachKernelDriver();
				}

				iface.claim();
			} catch (e: unknown) {
				this.logger.error('An unexpected error occurred', e);
				return reject(
					new InterfaceError(`Could not claim interface ${DEVICE_INTERFACE}`, DEVICE_INTERFACE, { cause: e }),
				);
			}

			const interruptEndpoint = iface.endpoints.find((e) => e.address === INTERRUPT_ENDPOINT);

			if (!interruptEndpoint) {
				return reject(
					new InterfaceError(`interruptEndpoint ${INTERRUPT_ENDPOINT} not found`, INTERRUPT_ENDPOINT),
				);
			}

			this.interruptEndpoint = interruptEndpoint as InEndpoint;
			this.setupListeners();
			this.isOpen = true;
			resolve(true);
		});
	}

	private setupListeners(): void {
		this.interruptEndpoint.on('data', (data: Buffer) => {
			if (bufferStartsWith(data, Buffer.from([0x03, 0x55, 0x40, 0x01]))) {
				if (data.length < 5) return;
				const battery = data[4];
				if (battery !== undefined && battery !== this.lastBattery) {
					this.lastBattery = battery;
					this.emit('batteryChange', battery);
				}
			}
		});

		this.interruptEndpoint.on('error', (err: Error) => {
			this.emit('error', err);
		});

		this.on('newListener', (event) => {
			if (event === 'batteryChange' && this.listenerCount('batteryChange') === 0) {
				this.startPolling();
			}
		});

		this.on('removeListener', (event) => {
			if (event === 'batteryChange' && this.listenerCount('batteryChange') === 0) {
				this.stopPolling();
			}
		});
	}

	private startPolling(): void {
		if (!this.isOpen || !this.interruptEndpoint) return;
		try {
			this.interruptEndpoint.startPoll(1, 64);
		} catch (e) {
			this.logger.error('Failed to start polling', e);
		}
	}

	private stopPolling(): void {
		if (!this.interruptEndpoint) return;
		try {
			this.interruptEndpoint.stopPoll();
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
		if (this.interruptEndpoint) {
			try {
				this.interruptEndpoint.stopPoll();
			} catch {
				/* empty */
			}
		}

		if (!this.deviceInterface) {
			this.device?.close();
			return;
		}

		await new Promise<void>((resolve, reject) => {
			this.deviceInterface.release(true, (err) => {
				if (err) {
					reject(
						new InterfaceError('Error releasing interface', this.deviceInterface.interfaceNumber, {
							cause: err,
						}),
					);
					return;
				}

				resolve();
			});
		});

		this.device?.close();
		this.isOpen = false;
	}

	checkIsOpen(): void {
		if (!this.isOpen) throw new DriverError('You have to open the device first');
	}

	controlTransfer(options: ControlTransferOut): Promise<number>;
	controlTransfer(options: ControlTransferOptions): Promise<number | Buffer> {
		this.checkIsOpen();

		return new Promise<number | Buffer>((resolve, reject) => {
			this.device.controlTransfer(
				options.bmRequestType,
				options.bRequest,
				options.wValue,
				options.wIndex,
				options.data,
				(err, res) => {
					if (err) {
						return reject(new ControlTransferError('Control transfer failed', { cause: err }));
					}

					if (res === undefined) {
						return reject(new ControlTransferError('Control transfer returned undefined'));
					}

					resolve(res);
				},
			);
		});
	}

	/**
	 * Sends a read request via Report 0xA0 and waits for the firmware response.
	 *
	 * The firmware uses 0xA0 as an RPC transport layer:
	 *   SET_REPORT 0xA0 → firmware queues the read
	 *   GET_REPORT (ack) → firmware returns 0x90 when data is ready
	 *   GET_REPORT (data)→ firmware returns the actual payload
	 *
	 * @param reportId    Target report ID to read (e.g., 0x04 for DPI).
	 * @param payloadSize Expected payload size in bytes (wireless size).
	 * @throws {ControlTransferError} If the ACK byte is not 0x90.
	 */
	async getReport(reportId: number, payloadSize: number): Promise<Buffer<ArrayBufferLike>> {
		this.checkIsOpen();

		await this.controlTransfer({
			bmRequestType: 0xa1,
			bRequest: 0x01,
			wValue: 0x03a0,
			wIndex: 2,
			data: 64,
		});

		await this.controlTransfer({
			bmRequestType: 0x21,
			bRequest: 0x09,
			wValue: 0x03a0,
			wIndex: 2,
			data: Buffer.from([0xa0, reportId, payloadSize, 0x00, 0x01, 0x00, 0x00, 0x00]),
		});

		// ACK
		await this.controlTransfer({
			bmRequestType: 0xa1,
			bRequest: 0x01,
			wValue: 0x03a0,
			wIndex: 2,
			data: 64,
		});

		await delay(this.delayMs);

		return (await this.controlTransfer({
			bmRequestType: 0xa1,
			bRequest: 0x01,
			wValue: (0x03 << 8) | reportId,
			wIndex: 2,
			data: payloadSize,
		})) as unknown as Promise<Buffer>;
	}

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
	setPollingRate(rate: Rate | PollingRateBuilder): Promise<number> {
		this.checkIsOpen();
		const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

		await this.controlTransfer({
			data: setMacroBuffer,
			bmRequestType: 0x21,
			bRequest: 0x09,
			wValue: 0x0308,
			wIndex: 2,
		});

		await this.controlTransfer({
			data: secondPacket,
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});

		await this.controlTransfer({
			data: thirdPacket,
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});

		await this.controlTransfer({
			data: fourthPacket,
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
	}

	sendInternalStateResetReportBuilder(): Promise<number> {
		this.checkIsOpen();
		const builder = new InternalStateResetReportBuilder();

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
	}

	resetPollingRate(): Promise<number> {
		this.checkIsOpen();
		const builder = new PollingRateBuilder();

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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
		return this.getReport(0x04, this.connectionMode === ConnectionMode.Wired ? 0x38 : 0x34);
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
	getUserPreferences(): Promise<Buffer> {
		this.checkIsOpen();
		return this.getReport(0x05, 0x0f);
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
	getPollingRate(): Promise<Buffer> {
		this.checkIsOpen();
		return this.getReport(0x06, 0x09);
	}

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
	getButtons(): Promise<Buffer> {
		this.checkIsOpen();
		return this.getReport(0x08, 0x3b);
	}

	resetDpi(): Promise<number> {
		this.checkIsOpen();
		const builder = new DpiBuilder();

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
	}

	resetMacro(): Promise<number> {
		this.checkIsOpen();
		const builder = new MacrosBuilder();

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

		return this.controlTransfer({
			data: builder.build(this.connectionMode),
			bmRequestType: builder.bmRequestType,
			bRequest: builder.bRequest,
			wValue: builder.wValue,
			wIndex: builder.wIndex,
		});
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

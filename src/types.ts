/**
 * Connection modes supported by the driver.
 */
export enum ConnectionMode {
	/** Wireless mode via 2.4GHz adapter */
	Wireless = 0xfa60,
	/** Wired mode via USB cable */
	Wired = 0xfa55,
}

/**
 * Base structure for USB control transfer options.
 */
interface ControlTransferBase {
	/** Request type (bmRequestType) */
	bmRequestType: number;
	/** Specific request (bRequest) */
	bRequest: number;
	/** Request value (wValue) */
	wValue: number;
	/** Request index (wIndex) */
	wIndex: number;
}

/**
 * Options for input control transfer (reading from the device).
 */
export interface ControlTransferIn extends ControlTransferBase {
	/** Size of data to be read */
	data: number;
}

/**
 * Options for output control transfer (writing to the device).
 */
export interface ControlTransferOut extends ControlTransferBase {
	/** Buffer of data to be sent */
	data: Buffer;
}

/**
 * Union of types for control transfer options.
 */
export type ControlTransferOptions = ControlTransferIn | ControlTransferOut;

/**
 * Mapping of physical mouse buttons.
 */
export enum Button {
	/** Main left button */
	LEFT = 0,
	/** Main right button */
	RIGHT = 1,
	/** Middle button (scroll click) */
	MIDDLE = 2,
	/** Forward side button */
	FORWARD = 3,
	/** Backward side button */
	BACKWARD = 4,
	/** DPI adjustment button */
	DPI = 5,
	/** Scroll up */
	SCROLL_UP = 6,
	/** Scroll down */
	SCROLL_DOWN = 7,
}

/**
 * Supported log levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Interface for the driver's internal logger.
 */
export interface Logger {
	/** Logs a debug message */
	debug(message: string, context?: unknown): void;

	/** Logs an informational message */
	info(message: string, context?: unknown): void;

	/** Logs a warning */
	warn(message: string, context?: unknown): void;

	/** Logs an error */
	error(message: string, context?: unknown): void;
}

export enum ReportId {
	DPI = 0x04,
	POLLING_RATE = 0x06,
	LIGHTING_SETTINGS = 0x05,
	BUTTON_MAPPING = 0x08,
	MACRO = 0x09,
	DEVICE_VERSION = 0x0b,
	READ_REPORT_ID = 0xa0,
	WAKE_UP_MODE = 0x07,
}

export enum PacketLength {
	DPI = 0x38,
	POLLING_RATE = 0x09,
	LIGHTING_SETTINGS = 0x0f,
	BUTTON_MAPPING = 0x3b,
	MACRO = 0x28,
	DEVICE_VERSION = 0x08,
}

export enum PacketLengthRead {
	DPI = 0x38,
	POLLING_RATE = 0x09,
	LIGHTING_SETTINGS = 0x0f,
	BUTTON_MAPPING = 0x3b,
	MACRO = 0x83,
	DEVICE_VERSION = 0x08,
}

/**
 * Represents an optional value that can either be of type `T` or `null`.
 *
 * The `Option` type is useful for representing values that might be absent or explicitly empty. It is often used
 * in scenarios where a value may or may not exist, providing a way to handle nullability at the type level.
 *
 * @template T The type of the underlying value.
 */
export type Option<T> = T | null;

/**
 * Represents the result of an operation that can either be a successful outcome of type T
 * or an error of type E. By default, E is of type Error.
 *
 * This type can be used to model functions or processes where the result might not always
 * be successful and an error may need to be handled.
 *
 * @template T The type of the successful result.
 * @template E The type of the error result. Defaults to Error.
 */
export type Result<T, E = Error> = T | E;

export type ProfileId = number;

export enum MessageTypes {
	BATTERY = 0x40,
	BATTERY1 = 0x41,
	FEATURE_REPORT_STATUS = 0x50,
	VIBRATION_MODE_NOTIFICATION = 0x11,
	DPI_CYCLE=0x10
}

export const MessageTypesLength = 5;

export enum BatteryStatus {
	NORMAL = 0x01,
	FULLY_CHARGED = 0x02,
	CHARGING_IN_PROGRESS = 0x03,
}

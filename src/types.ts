/**
 * Connection modes supported by the driver.
 */
export enum ConnectionMode {
	/** Wireless mode via 2.4GHz adapter */
	Adapter = 0xfa60,
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
	// eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
	MACRO = 0x09,
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

export type Result<T, E = Error> = T | E;

export type ProfileId = number;

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
	PROFILE = 0x0c,
}

export enum PacketLength {
	DPI = 0x38,
	POLLING_RATE = 0x09,
	LIGHTING_SETTINGS = 0x0f,
	BUTTON_MAPPING = 0x3b,
	MACRO = 0x28,
	DEVICE_VERSION = 0x08,
	PROFILE = 0x0a,
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
 * Represents an optional value that can either hold a value of type `T`
 * or be empty (`None`).
 *
 * This type is typically used to represent values that may or may not exist.
 * It provides a way to handle the absence of values in a more expressive way than
 * using `null` or `undefined`, as it explicitly models the concept of a
 * potentially missing value.
 *
 * @template T The type of the value that this option may hold.
 */
export type Option<T> = T | None;

/**
 * Represents the absence of a value or a deliberate non-value.
 *
 * The `None` type is defined as `null` and is often used to signify
 * that no value is present or applicable in a specific context.
 *
 * This can be useful for explicitly indicating intentional emptiness,
 * absence of data, or results where other values are invalid or undefined.
 */
export type None = null;

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

/**
 * Device event message codes received through the Interrupt IN endpoint.
 *
 * @see docs/messages/README.md
 */
export enum MessageTypes {
	/** Device connection / battery status event (0x40) */
	BATTERY = 0x40,
	/** Alternate device connection / battery status event (0x41) */
	BATTERY1 = 0x41,
	/** Feature report execution status report (0x50) */
	COMMAND_CONFIRMATION = 0x50,
	/** Vibration mode changed notification (0x11) */
	VIBRATION_MODE_NOTIFICATION = 0x11,
	/** DPI cycle switch event (0x10) */
	DPI_CYCLE = 0x10,
}

/**
 * Expected byte length for device event notification packets (5 bytes).
 */
export const MessageTypesLength = 5;

/**
 * Represents the charging and power states reported by the device connection message.
 *
 * @see docs/messages/device-connection-message.md
 */
export enum BatteryStatus {
	NORMAL = 0x01,
	FULLY_CHARGED = 0x02,
	CHARGING_IN_PROGRESS = 0x03,
}

/**
 * Structured snapshot representing the current battery state and charging flags.
 */
export interface BatteryInfo {
	/**
	 * Detailed battery state (NORMAL, FULLY_CHARGED, CHARGING_IN_PROGRESS).
	 */
	status: BatteryStatus;
	/**
	 * Battery level percentage (0 to 100).
	 */
	percentage: number;
}

/**
 * Represents a command that is pending execution and awaiting a response.
 *
 * This interface defines the structure for tracking commands that have been
 * issued but have not yet received confirmation. It includes the ID of the
 * command, handlers to resolve or reject the command based on an outcome, and
 * a timeout for command expiration.
 *
 * Properties:
 * - `reportId`: A unique identifier associated with the pending command.
 *   Used to track and match command confirmations.
 * - `resolve`: A function that is invoked to confirm successful execution
 *   of the pending command. Passes a `CommandConfirmation` object as an
 *   argument to signal completion.
 * - `reject`: A function that is invoked to handle an error or failure
 *   related to the command execution. Accepts an `Error` object detailing
 *   the issue.
 * - `timeout`: A timer reference used to track the time allowed for the
 *   pending command to receive confirmation. If the timeout is reached, the
 *   command is considered to have failed.
 */
export interface PendingCommand {
	reportId: number;
	resolve: (status: CommandConfirmation) => void;
	reject: (error: Error) => void;
	timeout: NodeJS.Timeout;
}

/**
 * An enumeration representing the result of a command execution.
 *
 * This enum is used to indicate whether a command was successfully
 * executed or if it encountered a failure during its operation.
 *
 * Enum members:
 * - `Success`: Denotes that the command executed successfully.
 * - `Failure`: Denotes that the command execution failed.
 *
 * @see docs/messages/feature-report-status.md
 */
export enum CommandConfirmation {
	Success = 0x00,
	Failure = 0x01,
}

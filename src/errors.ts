export class DriverError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = new.target.name;
	}
}

/**
 * An error is thrown when the provided parameters are invalid or missing
 */
export class ParamsError extends DriverError {
	constructor(
		public paramName: string,
		message?: string,
		options?: { cause?: unknown },
	) {
		super(message ?? `The parameter ${paramName} is missing or is not of the desired type.`, options);
	}
}

/**
 * Generic error related to the USB device
 */
export class DeviceError extends DriverError {}

/**
 * This error is thrown when there is a failure to access or claim a USB interface
 */
export class InterfaceError extends DriverError {
	constructor(
		message: string,
		public interfaceNumber: number,
		options?: { cause?: unknown },
	) {
		super(message, options);
	}
}

/**
 * Basic error causing data transfer failures
 */
export class TransferError extends DriverError {
	constructor(
		message: string,
		public endpoint?: number,
		options?: { cause?: unknown },
	) {
		super(message, options);
	}
}

/**
 * Specific error related to Control Transfers (USB) failures
 */
export class ControlTransferError extends TransferError {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, undefined, options);
	}
}

/**
 * An error is thrown when an operation exceeds the expected timeout
 */
export class TimeoutError extends DriverError {}

/**
 * Represents an error that occurs during transportation
 *
 * @class TransportError
 * @extends DriverError
 */
export class TransportError extends DriverError {}

/**
 * Represents an error that occurs when a command cannot be sent successfully.
 *
 * This class extends the `DriverError` class and is used specifically
 * to handle errors related to sending commands within the driver context.
 * It provides richer semantics for error handling in scenarios where a
 * command transmission fails.
 *
 * Common scenarios for this error might include:
 * - Network-related issues preventing the command from reaching its destination.
 * - Protocol violations or unexpected conditions during command processing.
 * - Failures arising from transport layer interruptions or shutdowns.
 *
 * Instances of this error class allow you to identify and isolate these
 * command-specific failures from other general driver errors.
 */
export class SendCommandError extends DriverError {}

/**
 * This class represents an error that occurs when an attempt is made to issue a
 * new command while another command is already in progress.
 *
 * The `CommandInProgressError` extends the generic `DriverError` to provide a
 * specific error type for situations where command queuing or parallel execution
 * is not supported or allowed.
 *
 * @class
 * @extends DriverError
 * @param {Object} [options] - Optional settings for the error.
 * @param {unknown} [options.cause] - The underlying cause of the error, if any.
 */
export class CommandInProgressError extends DriverError {
	constructor(options?: { cause?: unknown }) {
		super('another command is already pending', options);
	}
}

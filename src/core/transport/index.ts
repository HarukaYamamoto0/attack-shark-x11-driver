import * as HID from 'node-hid';
import type { Device } from 'node-hid';
import type { ReportId } from '../../types';

/**
 * Represents a transport mechanism for communicating with a mouse device.
 * Provides methods for managing the connection and sending/receiving data.
 */
export interface MouseTransport {
	/**
	 * Opens a connection asynchronously.
	 * @return {Promise<void>} A promise that resolves when the operation is complete.
	 */
	open(): Promise<void>;

	/**
	 * Closes the current connection, releasing any held resources.
	 *
	 * @return {Promise<void>} A promise that resolves when the resource is successfully closed.
	 */
	close(): Promise<void>;

	/**
	 * Sends a feature report to a connected device.
	 *
	 * @param {Buffer} data - The buffer containing the feature report to be sent.
	 * @return {Promise<number>} A promise that resolves to the number of bytes written.
	 */
	sendFeatureReport(data: Buffer): Promise<number>;

	/**
	 * Retrieves a feature report from a connected device.
	 *
	 * @param {ReportId} reportId - The ID of the report to fetch from the device.
	 * @param {number} reportLength - The expected length of the report to retrieve.
	 * @return {Promise<Uint8Array>} A promise that resolves to a Uint8Array containing the report data.
	 */
	getFeatureReport(reportId: ReportId, reportLength: number): Promise<Uint8Array>;

	/**
	 * Registers a listener function to handle incoming data.
	 *
	 * @param listener A callback function that is invoked whenever data is received. The function takes a single parameter:
	 *        - `data` (Buffer): The data received as a Buffer object.
	 * @return void This method does not return a value.
	 */
	onData(listener: (data: Buffer) => void): void;

	/**
	 * Registers an error handler that will be invoked when an error occurs.
	 *
	 * @param listener - A callback function that accepts an `Error` object as its parameter.
	 *                   This function will be executed when an error is encountered.
	 * @return void
	 */
	onError(listener: (error: Error) => void): void;
}

export interface TransportOptions {
	vendorId: number;
	productIds: {
		wired: number;
		wireless: number;
	};
}

/**
 * Finds and filters connected X11 devices based on the provided transport options.
 *
 * @param {TransportOptions} options - An object containing options for filtering devices,
 * including vendorId and productIds for wired and wireless devices.
 * @return {Promise<Device[]>} A promise that resolves to an array of devices matching the given criteria.
 */
export async function findX11Devices(options: TransportOptions): Promise<Device[]> {
	const devices = await HID.devicesAsync();

	return devices.filter(
		(d) =>
			d.vendorId === options.vendorId &&
			(d.productId === options.productIds.wired || d.productId === options.productIds.wireless),
	);
}

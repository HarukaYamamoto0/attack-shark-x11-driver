import type { ReportId } from '../../types';
import * as HID from 'node-hid';
import type { Device } from 'node-hid';
import { TransportError } from '../../index';
import { findX11Devices, type MouseTransport, type TransportOptions } from './index';

/*
 * the reason for having a separate class for this is to decouple the transport layer from the driver
 * and this also allows testing the driver using custom mocks.
 */
export class HidTransport implements MouseTransport {
	private command?: HID.HIDAsync | undefined;
	private events?: HID.HIDAsync | undefined;

	constructor(private readonly options: TransportOptions) {}

	async open(): Promise<void> {
		const device = await this.resolveDevice();

		if (!device.command.path) throw new TransportError('the path to the command interface was not found');
		if (!device.events.path) throw new TransportError('the path to the events interface was not found');

		this.command = await HID.HIDAsync.open(device.command.path);

		this.events =
			device.command.path === device.events.path ? this.command : await HID.HIDAsync.open(device.events.path);
	}

	async close(): Promise<void> {
		await this.command?.close();
		await this.events?.close();

		this.command = undefined;
		this.events = undefined;
	}

	sendFeatureReport(data: Buffer): Promise<number> {
		if (!this.command) throw new TransportError('Transport is not open');

		return this.command.sendFeatureReport(data);
	}

	getFeatureReport(reportId: ReportId, reportLength: number): Promise<Uint8Array> {
		if (!this.command) throw new TransportError('Transport is not open');

		return this.command.getFeatureReport(reportId, reportLength);
	}

	onData(listener: (data: Buffer) => void): void {
		if (!this.events) throw new TransportError('Transport is not open');

		this.events.on('data', listener);
	}

	onError(listener: (error: Error) => void): void {
		this.events?.on('error', listener);
		this.command?.on('error', listener);
	}

	private async resolveDevice(): Promise<{ command: Device; events: Device }> {
		const devices = await findX11Devices(this.options);

		const command = devices.find((d) => d.interface === 2 && d.usagePage === 0x0b);

		const events = devices.find((d) => d.interface === 2 && d.usagePage === 0x0a);

		if (!command?.path) throw new TransportError('Command HID collection not found');
		if (!events?.path) throw new TransportError('Event HID collection not found');

		return {
			command,
			events,
		};
	}
}

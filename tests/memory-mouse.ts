// A pretend X11 for the tests: keeps every profile's reports separately, reads them back by the profile in the
// read request, acknowledges writes like the mouse does, and can "press" a button.
import { AttackSharkX11 } from '../src/core/AttackSharkX11';
import type { MouseTransport } from '../src/core/transport';
import { ReportId } from '../src/types';

export class MemoryMouse implements MouseTransport {
	stored = new Map<string, Uint8Array>();
	state = { current: 1, max: 1 };
	writes: Uint8Array[] = [];
	/** The status the mouse acknowledges a write with, 0x00 is success. */
	statusFor: (report: Uint8Array) => number = () => 0x00;
	/** Store writes under the active profile instead of the profile byte in the report, a mouse that ignores it. */
	ignoresProfileByte = false;
	closed = false;
	private readParameter = 1;
	/** A read only works right after a permission request (report 0xA0) and only once, like on the real mouse. */
	private permitted = false;
	private listener: ((data: Uint8Array) => void) | null = null;

	open(): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		this.closed = true;
		return Promise.resolve();
	}

	sendFeatureReport(data: Uint8Array): Promise<number> {
		if (this.closed) return Promise.reject(new Error('the device is closed'));
		const copy = new Uint8Array(data);
		this.writes.push(copy);
		const id = copy[0] ?? 0;
		if (id === 0xa0) {
			this.readParameter = copy[4] ?? 0;
			this.permitted = true;
			return Promise.resolve(copy.length);
		}
		const status = this.statusFor(copy);
		if (status === 0x00) {
			if (id === ReportId.PROFILE_SETTING) this.state = { current: copy[2] ?? 0, max: copy[4] ?? 0 };
			else this.stored.set(`${id}:${this.ignoresProfileByte ? this.state.current : copy[2]}`, copy);
		}
		setTimeout(() => this.listener?.(new Uint8Array([0x03, 0x55, 0x50, status, id])), 2);
		return Promise.resolve(copy.length);
	}

	getFeatureReport(reportId: number, length: number): Promise<Uint8Array> {
		if (this.closed) return Promise.reject(new Error('the device is closed'));
		const response = new Uint8Array(length);
		if (reportId === 0xa0) response.set([0xa0, 0x01]);
		else if (!this.permitted)
			response.fill(0xff); // without permission the bytes are garbage
		else if (reportId === ReportId.PROFILE_SETTING) {
			const { current, max } = this.state;
			response.set([0x0c, 0x0a, current, ~current & 0xff, max, ~max & 0xff]);
		} else
			response.set(
				(this.stored.get(`${reportId}:${this.readParameter}`) ?? new Uint8Array()).subarray(0, length),
			);
		if (reportId !== 0xa0) this.permitted = false;
		return Promise.resolve(response);
	}

	onData(listener: (data: Uint8Array) => void): void {
		this.listener = listener;
	}

	onError(): void {
		// the pretend mouse never errors
	}

	storedReport(reportId: number, profile: number): Uint8Array {
		return this.stored.get(`${reportId}:${profile}`) ?? new Uint8Array();
	}

	/** The writes of one report id from `from` on, in the order they happened. */
	writesOf(reportId: number, from = 0): Uint8Array[] {
		return this.writes.slice(from).filter((w) => w[0] === reportId);
	}

	/** Sends the PC an event the way the mouse would, e.g. [0x03, 0x55, 0x80, 0x02, 0x00]. */
	sendEvent(bytes: number[]): void {
		this.listener?.(new Uint8Array(bytes));
	}

	/** What a button set to REPORT_BUTTON sends when it's pressed, 03 00 30 <button> 01 (the first byte of this event is 00). */
	press(button: number): void {
		this.sendEvent([0x03, 0x00, 0x30, button, 0x01]);
	}

	release(button: number): void {
		this.sendEvent([0x03, 0x00, 0x30, button, 0x00]);
	}
}

export async function openWith(mouse: MemoryMouse): Promise<AttackSharkX11> {
	const driver = new AttackSharkX11({ transport: mouse });
	await driver.open();
	return driver;
}

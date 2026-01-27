import * as usb from "usb";
import type {Device, Endpoint, Interface} from "usb";

const VID = 0x1d57
const PID = 0xfa55

const DEVICE_INTERFACE = 0x02
const INTERRUPT_ENDPOINT = 0x83

const TIMEOUT = 1000

export enum PollingRateOptions {
    powerSaving = 125,
    office = 250,
    gaming = 500,
    eSports = 1000
}

export class AttackSharkX11 {
    device: Device
    deviceInterface: Interface
    interruptEndpoint: Endpoint

    constructor() {
        const device = usb.findByIds(VID, PID)
        if (!device) {
            throw new Error("device not found")
        }
        this.device = device
        this.open()

        const iface = this.device.interface(DEVICE_INTERFACE)
        if (!iface) {
            throw new Error("interfaces not found")
        }
        this.deviceInterface = iface

        if (process.platform !== 'win32') {
            if (iface.isKernelDriverActive()) {
                try {
                    iface.detachKernelDriver();
                } catch (e) {
                    console.warn("Could not detach kernel driver:", e);
                }
            }
        }

        try {
            iface.claim();
        } catch (e: any) {
            if (process.platform === 'win32') {
                throw new Error(`Could not claim interface: ${e.message}. On Windows, you might need to use Zadig to install WinUSB driver for Interface 2.`);
            }
            throw e;
        }

        const interruptEndpoint = iface.endpoints.find(e => e.address === INTERRUPT_ENDPOINT)
        if (!interruptEndpoint) {
            throw new Error("interruptEndpoint not found")
        }
        this.interruptEndpoint = interruptEndpoint
    }

    async commandTransfer(
        data: Buffer,
        bmRequestType: number,
        bRequest: number,
        wValue: number,
        wIndex: number
    ) {
        return new Promise((resolve, reject) => {
            this.device.controlTransfer(
                bmRequestType,
                bRequest,
                wValue,
                wIndex,
                data,
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }

    async interruptTransfer(data: Buffer) {
        type TransferCb = Parameters<typeof this.interruptEndpoint.makeTransfer>[1];
        return new Promise((resolve, reject) => {
            const cb: TransferCb = (err, data, length) => {
                if (err) return reject(err);
                return resolve(data.slice(0, length));
            }
            const transfer = this.interruptEndpoint.makeTransfer(TIMEOUT, cb)
            transfer.submit(data, cb)
        })
    }

    open() {
        this.device.open()
    }

    close() {
        if (this.deviceInterface) {
            try {
                this.deviceInterface.release(true, (err) => {
                    if (err) console.error("Error releasing interface:", err);
                    this.device?.close();
                });
            } catch (e) {
                this.device?.close();
            }
        } else {
            this.device?.close();
        }
    }

    encodeDpi(dpi: number): number {
        if (dpi >= 22000) return 0x81;
        if (dpi < 50) return 0x01;
        return Math.round(dpi / 50);
    }

    buildHighDpiMask(dpis: number[]): number {
        let mask = 0;

        for (let i = 0; i < 6; i++) {
            if (dpis[i] >= 22000) {
                mask |= (1 << i);
            }
        }

        return mask;
    }

    async setPollingRate(rate: PollingRateOptions) {
        const report = Buffer.alloc(9)

        report[0] = 0x06
        report[1] = 0x09
        report[2] = 0x01

        switch (rate) {
            case PollingRateOptions.powerSaving: {
                report[3] = 0x08
                report[4] = 0xF7
                break;
            }
            case PollingRateOptions.office: {
                report[3] = 0x04
                report[4] = 0xFB
                break;
            }
            case PollingRateOptions.gaming: {
                report[3] = 0x02
                report[4] = 0xFD
                break;
            }
            case PollingRateOptions.eSports: {
                report[3] = 0x01
                report[4] = 0xFE
                break;
            }
        }

        await this.commandTransfer(
            report,
            0x21,
            0x09,
            0x0306,
            2
        );
    }

    async setKeyResponseTime(ms: number) {
        if (ms < 4 || ms > 50 || ms % 2 !== 0) {
            throw new Error("Valor inválido (use 4–50ms, step 2)");
        }

        const value = ((ms - 4) / 2) + 0x02;

        const report = Buffer.alloc(13);

        report[0] = 0x05;
        report[1] = 0x0F;
        report[2] = 0x01;
        report[3] = 0x00;
        report[4] = 0x03;
        report[5] = 0xA8;
        report[6] = 0x00;
        report[7] = 0xFF;
        report[8] = 0x00;
        report[9] = 0x01;
        report[10] = value; // slider
        report[11] = 0x01;

        let checksum = 0;

        for (let i = 3; i <= report.length - 3; i++) {
            checksum = (checksum + report[i]) & 0xFF;
        }
        report[12] = checksum;

        await this.commandTransfer(
            report,
            0x21,
            0x09,
            0x0305,
            2
        );
    }

    async setDpiStages(
        stages: [number, number, number, number, number, number],
        activeStage: number
    ) {
        if (activeStage < 1 || activeStage > 6) {
            throw new Error("Stage ativo inválido (1–6)");
        }

        const report = Buffer.alloc(52, 0x00);

        // Header fixo
        report[0] = 0x04;
        report[1] = 0x38;
        report[2] = 0x01;

        // angle snap / ripple (mantidos off)
        report[3] = 0x00;
        report[4] = 0x00;

        report[5] = 0x3F;

        // === DPI encoding ===
        for (let i = 0; i < 6; i++) {
            report[8 + i] = this.encodeDpi(stages[i]);
        }

        // === High DPI bitmask ===
        const mask = this.buildHighDpiMask(stages);

        report[6] = mask;
        report[7] = mask;

        // === Flags individuais por stage ===
        for (let i = 0; i < 6; i++) {
            report[21 + i] = stages[i] >= 22000 ? 0x01 : 0x00;
        }

        // Stage atual
        report[24] = activeStage;

        // Trailer fixo observado
        report[49] = 0x02;
        report[50] = 0x0F;

        // === Checksum ===
        let checksum = 0;
        for (let i = 3; i <= 49; i++) {
            checksum = (checksum + report[i]) & 0xFF;
        }
        report[51] = checksum;

        await this.commandTransfer(
            report,
            0x21,
            0x09,
            0x0304,
            2
        );
    }
}
import type {Device, Endpoint, Interface} from "usb";
import * as usb from "usb";
import {PollingRateBuilder, PollingRateOptions} from "./protocols/PollingRateBuilder.js";
import {UserPreferencesBuilder} from "./protocols/UserPreferencesBuilder.js";
import {ConnectionMode, type UserPreferenceOptions} from "./types.js";

const VID = 0x1d57;
const PID_WIRELESS = 0xfa60;
const PID_WIRED = 0xfa55;

const DEVICE_INTERFACE = 0x02
const INTERRUPT_ENDPOINT = 0x83

export class AttackSharkX11 {
    public readonly productId: number;
    device: Device
    deviceInterface: Interface
    interruptEndpoint: Endpoint

    constructor() {
        const device = usb.getDeviceList().find(d =>
            d.deviceDescriptor.idVendor === VID &&
            (d.deviceDescriptor.idProduct === PID_WIRELESS || d.deviceDescriptor.idProduct === PID_WIRED)
        );

        if (!device) {
            throw new Error("Mouse Attack Shark X11 not found");
        }
        this.device = device;
        this.productId = device.deviceDescriptor.idProduct;
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

    /**
     * Returns to the current connection mode.
     */
    get connectionMode(): ConnectionMode {
        return this.productId === PID_WIRELESS ? ConnectionMode.Adapter : ConnectionMode.Wired
    }

    /**
     * Check if it's in wireless mode.
     */
    get isWireless(): boolean {
        return this.productId === PID_WIRELESS;
    }

    async commandTransfer(
        data: Buffer,
        bmRequestType: number,
        bRequest: number,
        wValue: number,
        wIndex: number
    ): Promise<number | Buffer<ArrayBufferLike> | undefined> {
        return new Promise((resolve, reject) => {
            this.device.controlTransfer(
                bmRequestType,
                bRequest,
                wValue,
                wIndex,
                data,
                (err, buffer) => {
                    if (err) reject(err);
                    else resolve(buffer);
                }
            );
        });
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

    async setPollingRate(rate: PollingRateOptions) {
        const pollingRateProtocol = new PollingRateBuilder()
            .setPollingRate(rate)

        return await this.commandTransfer(
            pollingRateProtocol.build(this.connectionMode),
            pollingRateProtocol.bmRequestType,
            pollingRateProtocol.bRequest,
            pollingRateProtocol.wValue,
            pollingRateProtocol.wIndex
        );
    }

    async setUserPreferences(options: Partial<UserPreferenceOptions> = {}) {
        const opts: UserPreferenceOptions = {
            ...UserPreferencesBuilder.DEFAULT_PREFS,
            ...options,
            rgb: {
                ...UserPreferencesBuilder.DEFAULT_PREFS.rgb,
                ...options.rgb
            }
        };

        const builder = new UserPreferencesBuilder()
            .setLightMode(opts.lightMode)
            .setLedSpeed(opts.ledSpeed)
            .setRgb(opts.rgb)
            .setSleep(opts.sleepTime)
            .setDeepSleep(opts.deepSleepTime)
            .setKeyResponse(opts.keyResponse);

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async resetUUUUUUUUUUURate() {
        let UUUUUUUUUUUBuffer = Buffer.from("0c0a01fe01fe", "hex")

        return await this.commandTransfer(
            UUUUUUUUUUUBuffer,
            0x21,
            0x09,
            0x030C,
            2
        );
    }

    async resetPollingRate() {
        const pollingRateProtocol = new PollingRateBuilder()

        return await this.commandTransfer(
            pollingRateProtocol.build(this.connectionMode),
            pollingRateProtocol.bmRequestType,
            pollingRateProtocol.bRequest,
            pollingRateProtocol.wValue,
            pollingRateProtocol.wIndex
        );
    }

    async resetDpiSystem() {
        let dpiSystemBuffer = Buffer.from(
            "04380100013f20201225384b75810000000000000001000002ff000000ff000000ffffff0000ffffff00ffff4000ffffff020f6800000000",
            "hex"
        )

        return await this.commandTransfer(
            dpiSystemBuffer,
            0x21,
            0x09,
            0x0304,
            2
        );
    }

    async resetMacro() {
        const macroBuffer = Buffer.from(
            "083b010200000300000400000100000100000d00000600000500000100000100000100000100000100000100000100000100000900000a0000003e",
            "hex"
        )

        return await this.commandTransfer(
            macroBuffer,
            0x21,
            0x09,
            0x0308,
            2
        )
    }

    async resetUserPreferences() {
        // Sets default key response (8ms) and other power settings
        const builder = new UserPreferencesBuilder().setKeyResponse(8);

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async reset() {
        await this.resetUUUUUUUUUUURate()
        await this.resetDpiSystem()
        await this.resetUserPreferences()
        await this.resetPollingRate()
        await this.resetMacro()
    }
}
import type {Device, InEndpoint, Interface} from "usb";
import * as usb from "usb";
import {PollingRateBuilder, PollingRate} from "../protocols/PollingRateBuilder.js";
import {UserPreferencesBuilder, type UserPreferencesBuilderOptions} from "../protocols/UserPreferencesBuilder.js";
import {type MacroBuilderOptions, MacrosBuilder} from "../protocols/MacrosBuilder.js";
import {InternalStateResetReportBuilder} from "../protocols/InternalStateResetReportBuilder.js";
import {delay} from "../utils/delay.js";
import {DpiBuilder} from "../protocols/DpiBuilder.js";
import {CustomMacroBuilder, type CustomMacroBuilderOptions} from "../protocols/CustomMacroBuilder.js";
import {ConnectionMode} from "../types.js";

const VID = 0x1d57;
const PID_WIRELESS = 0xfa60;
const PID_WIRED = 0xfa55;

const DEVICE_INTERFACE = 0x02
const INTERRUPT_ENDPOINT = 0x83

export class AttackSharkX11 {
    public readonly productId: number;
    device: Device
    deviceInterface: Interface
    interruptEndpoint: InEndpoint

    private lastBattery: number = -1

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
        this.interruptEndpoint = interruptEndpoint as InEndpoint
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

    async open() {
        this.device.open() // TODO: Remove the call from inside the constructor and add a response if the mouse button successfully opens.
    }

    async close() {
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

    /**
     * Retrieves the current battery level from the device.
     *
     * @return {Promise<number | undefined>} A promise that resolves with the battery level as a number, or undefined if unavailable.
     *                                       Throws an error if the battery packet is invalid or if a communication error occurs.
     */
    async getBatteryLevel(): Promise<number | undefined> {
        const endpoint = this.interruptEndpoint as InEndpoint;

        return new Promise((resolve, reject) => {
            endpoint.transfer(64, (err, data) => {
                if (err) return reject(err);
                if (!data || data.length < 4) {
                    return reject(new Error("Invalid battery packet"));
                }

                const battery = data[4];
                resolve(battery);
            });
        });
    }

    /**
     * Registers a listener for battery level changes and starts polling for updates.
     *
     * @param listener A callback function that receives the updated battery level as a number.
     *                 The battery level is provided if it has changed since the last update.
     * @return A function that can be called to stop polling for battery level changes and remove the listener.
     */
    onBatteryChange(listener: (battery: number) => void): () => void {
        const endpoint = this.interruptEndpoint as InEndpoint;

        const handleData = (data: Buffer) => {
            if (data.length < 4) return;

            const battery = data[4];
            if (!battery) return;

            if (battery !== this.lastBattery) {
                this.lastBattery = battery;
                listener(battery);
            }
        };

        endpoint.on("data", handleData);
        endpoint.startPoll(1, 64);

        return () => {
            endpoint.stopPoll();
            endpoint.removeListener("data", handleData);
        };
    }

    async setPollingRate(rate: PollingRate | PollingRateBuilder) {
        const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setPollingRate(rate);

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async setCustomMacro(macro: CustomMacroBuilder) {
        const [setMacroBuffer, secondPacket, thirdPacket, fourthPacket] = macro.build(this.connectionMode)

        await this.commandTransfer(
            setMacroBuffer!,
            0x21,
            0x09,
            0x0308,
            2,
        )
        await delay(500)

        await this.commandTransfer(
            secondPacket!,
            macro.bmRequestType,
            macro.bRequest,
            macro.wValue,
            macro.wIndex
        )
        await delay(500)

        await this.commandTransfer(
            thirdPacket!,
            macro.bmRequestType,
            macro.bRequest,
            macro.wValue,
            macro.wIndex
        )
        await delay(500)

        await this.commandTransfer(
            fourthPacket!,
            macro.bmRequestType,
            macro.bRequest,
            macro.wValue,
            macro.wIndex
        )
    }

    async setMacro(config: MacroBuilderOptions | MacrosBuilder) {
        const builder = config instanceof MacrosBuilder ? config : new MacrosBuilder(config);
        const buffer = builder.build(this.connectionMode);

        return this.commandTransfer(
            buffer,
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async setUserPreferences(options: Partial<UserPreferenceOptions> | UserPreferencesBuilder = {}) {
        const builder = options instanceof UserPreferencesBuilder ? options : (() => {
            const opts: UserPreferenceOptions = {
                ...UserPreferencesBuilder.DEFAULT_PREFS,
                ...options,
                rgb: {
                    ...UserPreferencesBuilder.DEFAULT_PREFS.rgb,
                    ...options.rgb
                }
            };

            return new UserPreferencesBuilder()
                .setLightMode(opts.lightMode)
                .setLedSpeed(opts.ledSpeed)
                .setRgb(opts.rgb)
                .setSleep(opts.sleepTime)
                .setDeepSleep(opts.deepSleepTime)
                .setKeyResponse(opts.keyResponse);
        })();

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async sendInternalStateResetReportBuilder() {
        const builder = new InternalStateResetReportBuilder()

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async setInternalStateResetReport(builder: InternalStateResetReportBuilder = new InternalStateResetReportBuilder()) {
        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
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

    async setDpi(builder: DpiBuilder) {
        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async resetDpi() {
        const builder = new DpiBuilder()

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async resetMacro() {
        const macroProtocol = new MacrosBuilder()

        return await this.commandTransfer(
            macroProtocol.build(this.connectionMode),
            macroProtocol.bmRequestType,
            macroProtocol.bRequest,
            macroProtocol.wValue,
            macroProtocol.wIndex
        )
    }

    async resetUserPreferences() {
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
        await this.sendInternalStateResetReportBuilder()
        await delay(500)
        await this.resetDpi()
        await delay(500)
        await this.resetUserPreferences()
        await delay(500)
        await this.resetPollingRate()
        await delay(500)
        await this.resetMacro()
    }
}
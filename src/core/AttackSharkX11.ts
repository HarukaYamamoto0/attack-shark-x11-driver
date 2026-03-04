import type {Device, InEndpoint, Interface} from "usb";
import * as usb from "usb";
import {PollingRate, PollingRateBuilder} from "../protocols/PollingRateBuilder.js";
import {UserPreferencesBuilder, type UserPreferencesBuilderOptions} from "../protocols/UserPreferencesBuilder.js";
import {type MacroBuilderOptions, MacrosBuilder} from "../protocols/MacrosBuilder.js";
import {InternalStateResetReportBuilder} from "../protocols/InternalStateResetReportBuilder.js";
import {delay} from "../utils/delay.js";
import {DpiBuilder} from "../protocols/DpiBuilder.js";
import {CustomMacroBuilder, type CustomMacroBuilderOptions, MacroMode} from "../protocols/CustomMacroBuilder.js";
import {Button, ConnectionMode} from "../types.js";

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
                // TODO: Once the driver is complete, remove this verification
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

    async getBatteryLevel(timeoutMs = 2000): Promise<number> {
        if (this.connectionMode === ConnectionMode.Wired) return -1;

        const endpoint = this.interruptEndpoint as InEndpoint;

        return new Promise((resolve, reject) => {
            let finished = false;

            const cleanup = () => {
                if (finished) return;
                finished = true;

                clearTimeout(timeout);
                endpoint.removeListener("data", handleData);

                try {
                    endpoint.stopPoll();
                } catch {
                }
            };

            const handleData = (data: Buffer) => {
                if (finished) return;
                if (!data || data.length < 5) return;

                if (
                    data[0] === 0x03 &&
                    data[1] === 0x55 &&
                    data[2] === 0x40 &&
                    data[3] === 0x01 &&
                    data[4] !== undefined
                ) {
                    const battery = data[4];

                    if (battery <= 100) {
                        cleanup();
                        resolve(battery);
                    }
                }
            };

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Timeout waiting for battery report"));
            }, timeoutMs);

            endpoint.on("data", handleData);
            endpoint.startPoll(1, 64);
        });
    }

    /**
     * Registers a listener for battery level changes and starts polling for updates.
     *
     * @param listener A callback function that receives the updated battery level as a number.
     *                 The battery level is provided if it has changed since the last update.
     *                 It is not updated in Wired mode because it is treated as charging the mouse battery.
     * @return A function that can be called to stop polling for battery level changes and remove the listener.
     */
    onBatteryChange(listener: (battery: number) => void): () => void {
        const endpoint = this.interruptEndpoint as InEndpoint;

        const handleData = (data: Buffer) => {
            if (
                data[0] === 0x03 &&
                data[1] === 0x55 &&
                data[2] === 0x40 &&
                data[3] === 0x01 &&
                data[4] !== undefined
            ) {

                const battery = data[4];
                if (!battery) return;

                if (battery !== this.lastBattery) {
                    this.lastBattery = battery;
                    listener(battery);
                }
            }
        }

        endpoint.on("data", handleData);
        endpoint.startPoll(1, 64);

        return () => {
            endpoint.stopPoll();
            endpoint.removeListener("data", handleData);
        };
    }

    async setPollingRate(rate: PollingRate | PollingRateBuilder) {
        const builder = rate instanceof PollingRateBuilder ? rate : new PollingRateBuilder().setRate(rate);

        return await this.commandTransfer(
            builder.build(this.connectionMode),
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        );
    }

    async setCustomMacro(options: CustomMacroBuilder | CustomMacroBuilderOptions) {
        const builder = options instanceof CustomMacroBuilder ? options : new CustomMacroBuilder(options)
        const [setMacroBuffer, secondPacket, thirdPacket, fourthPacket] = builder.build(this.connectionMode)

        await this.commandTransfer(
            setMacroBuffer,
            0x21,
            0x09,
            0x0308,
            2,
        )
        await delay(250)

        await this.commandTransfer(
            secondPacket,
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        )
        await delay(500)

        await this.commandTransfer(
            thirdPacket,
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
        )
        await delay(500)

        await this.commandTransfer(
            fourthPacket,
            builder.bmRequestType,
            builder.bRequest,
            builder.wValue,
            builder.wIndex
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

    async setUserPreferences(options: UserPreferencesBuilder | UserPreferencesBuilderOptions) {
        const builder = options instanceof UserPreferencesBuilder ? options : new UserPreferencesBuilder(options)

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

    async resetCustomMacro() {
        const builder = new CustomMacroBuilder({
            playOptions: {
                mode: MacroMode.THE_NUMBER_OF_TIME_TO_PLAY,
                times: 1
            },
            targetButton: Button.BACKWARD,
            macroEvents: [],
        })

        await this.setCustomMacro(builder)
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
        await delay(250)
        await this.resetDpi()
        await delay(250)
        await this.resetUserPreferences()
        await delay(250)
        await this.resetPollingRate()
        await delay(250)
        await this.resetMacro()
        await delay(250)
        await this.resetCustomMacro()
    }
}
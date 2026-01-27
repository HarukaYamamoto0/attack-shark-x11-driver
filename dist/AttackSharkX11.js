import * as usb from "usb";
const VID = 0x1d57;
const PID = 0xfa55;
const DEVICE_INTERFACE = 0x02;
const COMMAND_ENDPOINT = 0x00;
const INTERRUPT_ENDPOINT = 0x81;
const TIMEOUT = 1000;
export class AttackSharkX11 {
    device;
    deviceInterface;
    controlEndpoint;
    interruptEndpoint;
    constructor() {
        const device = usb.findByIds(VID, PID);
        if (!device) {
            throw new Error("device not found");
        }
        this.device = device;
        this.open();
        const iface = this.device.interface(DEVICE_INTERFACE);
        if (iface.isKernelDriverActive()) {
            iface.detachKernelDriver();
        }
        iface.claim();
        if (!iface) {
            throw new Error("interfaces not found");
        }
        this.deviceInterface = iface;
        const controlEndpoint = this.deviceInterface?.endpoint(COMMAND_ENDPOINT);
        if (!controlEndpoint) {
            throw new Error("controlEndpoint not found");
        }
        this.controlEndpoint = controlEndpoint;
        const interruptEndpoint = iface?.endpoint(INTERRUPT_ENDPOINT);
        if (!interruptEndpoint) {
            throw new Error("interruptEndpoint not found");
        }
        this.interruptEndpoint = interruptEndpoint;
    }
    async commandTransfer(data, bmRequestType, bRequest, wValue, wIndex, callback) {
        this.device.controlTransfer(bmRequestType, // bmRequestType
        bRequest, // SET_REPORT
        wValue, // Feature + ReportID
        wIndex, // interface 2
        data, callback);
        // type TransferCb = Parameters<typeof this.controlEndpoint.makeTransfer>[1];
        // return new Promise((resolve, reject) => {
        //     const cb: TransferCb = (err, data, length) => {
        //         if (err) return reject(err);
        //         return resolve(data.slice(0, length));
        //     }
        //     const transfer = this.controlEndpoint.makeTransfer(TIMEOUT, cb)
        //     transfer.submit(data, cb)
        // })
    }
    async interruptTransfer(data) {
        return new Promise((resolve, reject) => {
            const cb = (err, data, length) => {
                if (err)
                    return reject(err);
                return resolve(data.slice(0, length));
            };
            const transfer = this.interruptEndpoint.makeTransfer(TIMEOUT, cb);
            transfer.submit(data, cb);
        });
    }
    open() {
        this.device.open();
    }
    close() {
        this.device?.close();
    }
}
//# sourceMappingURL=AttackSharkX11.js.map
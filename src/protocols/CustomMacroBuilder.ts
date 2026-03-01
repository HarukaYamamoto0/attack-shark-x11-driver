import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";
import type {ConnectionMode} from "../types.js";

export class CustomMacroBuilder implements BaseProtocolBuilder {
    readonly buffer: Buffer = Buffer.alloc(0);
    public readonly bmRequestType: number = 0x21;
    public readonly bRequest: number = 0x09;
    public readonly wValue: number = 0x0304;
    public readonly wIndex: number = 2;

    constructor() {

    }

    calculateChecksum(): number {
        return 0;
    }

    build(_mode: ConnectionMode): Buffer {
        return this.buffer
    }

    toString(): string {
        return this.buffer.toString("hex")
    }

    compareWitHexString(value: string): boolean {
        return this.toString() == value
    }
}
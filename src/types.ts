export interface ProtocolBuilder {
    readonly buffer: Buffer;
    readonly bmRequestType: number;
    readonly bRequest: number;
    readonly wValue: number;
    readonly wIndex: number;

    build(): Buffer;
}
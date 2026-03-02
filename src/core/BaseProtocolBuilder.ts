import {ConnectionMode} from "../types.js";

export interface BaseProtocolBuilder {
    /**
     * Represents a buffer instance used to store raw binary data.
     * The buffer can be used for reading and writing binary content
     * and is typically used in file operations, streams, or
     * handling encoded data in applications.
     *
     * This buffer instance must be initialized before use.
     */
    buffer: Buffer
    /**
     * Represents the bmRequestType field of a USB control transfer setup packet.
     * This field specifies the characteristics of the specific request being sent to a USB device.
     *
     * The bmRequestType value is a bit-mapped field that defines the direction of data transfer,
     * the type of request, and the intended recipient of the request. The value `0x21` indicates:
     * - Direction: Host-to-device (OUT).
     * - Request type: Class-specific request.
     * - Recipient: Interface.
     *
     * This field is typically used in conjunction with other fields like bRequest,
     * wValue, wIndex, and wLength to define and execute a USB control transfer.
     */
    bmRequestType: number
    /**
     * Represents a bRequest code used in a USB control transfer.
     *
     * The value of bRequest is typically a number that identifies a specific
     * request in USB standard or class-specific requests. For example, it may
     * correspond to standard requests like GET_DESCRIPTOR or SET_CONFIGURATION.
     *
     * In this case, the default value is set to 0x09, which often refers to
     * the SET_CONFIGURATION request in the USB standard, allowing the configuration
     * of a device to be changed.
     *
     * @type {number}
     */
    bRequest: number
    /**
     * Represents a numerical value used in a specific operation or configuration.
     * Typically stored as a hexadecimal number.
     *
     * @type {number}
     * @default 0x0300
     */
    wValue: number
    /**
     * Represents the index value used to track or reference a specific item
     * within a collection or data structure.
     *
     * By default, the index is initialized to 2.
     * This value can be used to access or identify an element at the
     * corresponding position in zero-based indexing schemes, such as arrays.
     *
     * @type {number}
     */
    wIndex: number

    /**
     * Calculates the checksum of the buffer
     *
     * @return {number} The computed checksum value as an integer.
     */
    calculateChecksum(): number

    /**
     * Returns the final buffer to be sent to the device
     */
    // @ts-ignore
    build(mode: ConnectionMode): Buffer | Buffer[]

    /**
     * Hexadecimal representation of the buffer (for debugging)
     */
    toString(): string

    /**
     * Compares the provided string with a predefined hexadecimal string and returns whether they match.
     *
     * @param {string} value - The string to compare against the predefined hexadecimal string.
     * @return {boolean} - Returns true if the provided string matches the predefined hexadecimal string, otherwise false.
     */
    compareWitHexString(value: string): boolean
}
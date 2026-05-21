# Polling Rate Protocol (Report 0x06)

This document describes the USB HID communication protocol used to configure the Polling Rate for the **Attack Shark X11** mouse. This setting controls how often the mouse reports its position to the computer.

## Technical Specifications

The protocol uses a standard HID Feature Report (`SET_REPORT`).

| Parameter          | Value    | Description                             |
|--------------------|----------|-----------------------------------------|
| **Request Type**   | `0x21`   | Host-to-Device, Class, Interface        |
| **Request**        | `0x09`   | SET_REPORT                              |
| **Value (wValue)** | `0x0306` | Feature Report (0x03), Report ID (0x06) |
| **Index (wIndex)** | `0x0002` | Interface Index 2                       |

## Data Packet Structure

The payload consists of a 9-byte buffer. The structure is identical for both **Wired** and **Wireless** connection modes.

### Byte-by-Byte Analysis

| Byte Index | Field        | Value (Hex) | Description                                             |
|------------|--------------|-------------|---------------------------------------------------------|
| 0          | Report ID    | `0x06`      | Must match the low byte of `wValue`                     |
| 1          | Command      | `0x09`      | Internal command identifier                             |
| 2          | Sub-command  | `0x01`      | Internal sub-command identifier                         |
| 3          | Polling Rate | `0x01-0x08` | Encoded value for the frequency (see table below)       |
| 4          | Checksum     | `0xXX`      | Complement of Byte 3 (`0xFF - Byte[3]`)                 |
| 5-8        | Padding      | `0x00`      | Null padding bytes                                      |

## Polling Rate Encoding

The mouse supports four polling rate levels. The value sent at index 3 determines the frequency:

| Rate (Hz) | Hex Value | Profile Name |
|-----------|-----------|--------------|
| 125 Hz    | `0x08`    | Power Saving |
| 250 Hz    | `0x04`    | Office       |
| 500 Hz    | `0x02`    | Gaming       |
| 1000 Hz   | `0x01`    | eSports      |

### Checksum Calculation
The checksum at index 4 is calculated using the formula: `0xFF - buffer[3]`.

## Wireshark Analysis Example

To observe this protocol in action using Wireshark with USBPcap:

1.  **Filter**: Apply the filter `usb.setup.wValue == 0x0306` to see only Polling Rate requests.
2.  **Request**: Look for `SET_REPORT` Request (Control Out).
3.  **Data**: The "HID Data" field will contain the 9-byte payload.

**Example Capture (1000 Hz / eSports):**
```text
Setup Data
    bmRequestType: 0x21
    bRequest: 9 (SET_REPORT)
    wValue: 0x0306 (Report Type: Feature, Report ID: 6)
    wIndex: 2 (Interface 2)
    wLength: 9
Data (Hex):
    06 09 01 01 fe 00 00 00 00
```

## Implementation Guide (TypeScript)

The following example demonstrates how to apply a 1000Hz polling rate using the driver's internal logic:

```typescript
// 1. Prepare the buffer
const buffer = Buffer.alloc(9);
buffer[0] = 0x06; // Report ID
buffer[1] = 0x09;
buffer[2] = 0x01;
buffer[3] = 0x01; // 1000 Hz (eSports)
buffer[4] = 0xFF - buffer[3]; // Checksum: 0xFE

// 2. Send the USB Control Request
await device.controlTransfer(
    0x21,         // bmRequestType
    0x09,         // bRequest (SET_REPORT)
    0x0306,       // wValue (Feature 0x03, ID 0x06)
    0x0002,       // wIndex (Interface 2)
    buffer        // Data payload
);
```

## Technical Summary

-   **Report ID**: 0x06
-   **Interface**: 2
-   **Payload Length**: 9 bytes
-   **Checksum**: `0xFF - RateValue`
-   **Compatibility**: Wired and Wireless (Dongle)

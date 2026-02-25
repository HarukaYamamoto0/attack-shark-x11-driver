# Polling Rate Protocol (Report 0x0306)

This document describes the USB HID communication protocol used to configure the Polling Rate for the Attack Shark X11
mouse, as implemented in the `PollingRateBuilder` class.

## USB HID Request Parameters

To apply Polling Rate settings, a `SET_REPORT` request is sent via USB with the following parameters:

- **bmRequestType**: `0x21` (Host-to-Device, Class-specific, Interface)
- **bRequest**: `0x09` (SET_REPORT)
- **wValue**: `0x0306` (Report Type: Feature, Report ID: 0x06)
- **wIndex**: `2` (Interface index)

## Data Buffer Structure

The payload consists of a 9-byte buffer. The structure is identical for both Wired and Wireless connection modes.

| Index | Field        | Type    | Description                                             |
|:------|:-------------|:--------|:--------------------------------------------------------|
| 0     | Header 1     | `uint8` | Fixed value `0x06` (Report ID)                          |
| 1     | Header 2     | `uint8` | Fixed value `0x09`                                      |
| 2     | Header 3     | `uint8` | Fixed value `0x01`                                      |
| 3     | Polling Rate | `uint8` | Encoded value for the polling rate                      |
| 4     | Checksum     | `uint8` | Complement of the polling rate value (`0xFF - Byte[3]`) |
| 5     | Padding      | `uint8` | Fixed value `0x00`                                      |
| 6     | Padding      | `uint8` | Fixed value `0x00`                                      |
| 7     | Padding      | `uint8` | Fixed value `0x00`                                      |
| 8     | Padding      | `uint8` | Fixed value `0x00`                                      |

## Polling Rate Encoding (Index 3)

The mouse supports four polling rate levels. The value sent in the buffer at index 3 is mapped as follows:

| Rate (Hz) | Hex Value | Description  |
|:----------|:----------|:-------------|
| 125 Hz    | `0x08`    | Power Saving |
| 250 Hz    | `0x04`    | Office       |
| 500 Hz    | `0x02`    | Gaming       |
| 1000 Hz   | `0x01`    | eSports      |

## Checksum Calculation

The checksum is located at index 4 and is calculated by subtracting the polling rate value (from index 3) from `0xFF`.

```typescript
function calculateChecksum(buffer: Buffer): number {
    return (0xFF - buffer[3]) & 0xFF;
}
```

Example for 1000 Hz:

- Polling Rate Value = `0x01`
- Checksum = `0xFF - 0x01` = `0xFE`
- Full Payload (hex): `06 09 01 01 FE 00 00 00 00`

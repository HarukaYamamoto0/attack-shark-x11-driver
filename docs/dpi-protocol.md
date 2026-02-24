# DPI Communication Protocol

This document describes the USB HID communication protocol used to configure DPI settings for the Attack Shark X11 mouse, as implemented in the `DpiBuilder` class.

## USB HID Request Parameters

To apply DPI settings, a `SET_REPORT` request is sent via USB with the following parameters:

- **bmRequestType**: `0x21` (Host-to-Device, Class-specific, Interface)
- **bRequest**: `0x09` (SET_REPORT)
- **wValue**: `0x0304` (Report Type: Feature, Report ID: 0x04)
- **wIndex**: `2` (Interface index)

## Data Buffer Structure

The payload consists of a 56-byte buffer. In wired mode, only the first 52 bytes are typically sent.

| Offset | Field | Type | Description |
| :--- | :--- | :--- | :--- |
| 0 | Header 1 | `uint8` | Fixed value `0x04` |
| 1 | Header 2 | `uint8` | Fixed value `0x38` |
| 2 | Header 3 | `uint8` | Fixed value `0x01` |
| 3 | Angle Snap | `uint8` | `0x01` to enable, `0x00` to disable |
| 4 | Ripple Control | `uint8` | `0x01` to enable, `0x00` to disable |
| 5 | Fixed | `uint8` | Fixed value `0x3F` |
| 6 | Stage Mask A | `uint8` | Bitmask for stages with DPI > 12000 (Stages 1-6 map to bits 0-5) |
| 7 | Stage Mask B | `uint8` | Duplicate of Stage Mask A |
| 8 | Stage 1 DPI | `uint8` | Encoded value for the 1st DPI stage |
| 9 | Stage 2 DPI | `uint8` | Encoded value for the 2nd DPI stage |
| 10 | Stage 3 DPI | `uint8` | Encoded value for the 3rd DPI stage |
| 11 | Stage 4 DPI | `uint8` | Encoded value for the 4th DPI stage |
| 12 | Stage 5 DPI | `uint8` | Encoded value for the 5th DPI stage |
| 13 | Stage 6 DPI | `uint8` | Encoded value for the 6th DPI stage |
| 14-15 | Fixed | `uint8[2]` | Fixed `0x00, 0x00` |
| 16 | High Flag 1 | `uint8` | `0x01` if Stage 1 DPI > 10000, else `0x00` |
| 17 | High Flag 2 | `uint8` | `0x01` if Stage 2 DPI > 10000, else `0x00` |
| 18 | High Flag 3 | `uint8` | `0x01` if Stage 3 DPI > 10000, else `0x00` |
| 19 | High Flag 4 | `uint8` | `0x01` if Stage 4 DPI > 10000, else `0x00` |
| 20 | High Flag 5 | `uint8` | `0x01` if Stage 5 DPI > 10000, else `0x00` |
| 21 | High Flag 6 | `uint8` | `0x01` if Stage 6 DPI > 10000, else `0x00` |
| 22-23 | Fixed | `uint8[2]` | Fixed `0x00, 0x00` |
| 24 | Active Stage | `uint8` | Index of the currently active DPI stage (1 to 6) |
| 25-49 | Fixed Data | `uint8[25]` | Internal fixed values and reserved space |
| 50 | Checksum High | `uint8` | High byte of the 16-bit checksum |
| 51 | Checksum Low | `uint8` | Low byte of the 16-bit checksum |
| 52-55 | Padding | `uint8[4]` | Wireless mode padding (fixed `0x00`) |

## DPI Value Encoding

DPI values are not stored as literal integers. Instead, they are mapped to specific hexadecimal values defined in `src/dpi-map.ts`. 

- **Range**: Supported from 50 up to 22000 DPI.
- **Steps**: Usually increments of 50.
- **Logic**: The driver looks up the closest supported DPI value in the map and retrieves the corresponding byte for the buffer.

## Checksum Calculation

The checksum is a simple 16-bit sum of the bytes in the buffer from index 3 to 49.

```typescript
function calculateChecksum(buffer: Buffer): number {
    let sum = 0;
    for (let i = 3; i <= 49; i++) {
        sum += buffer[i];
    }
    return sum & 0xFFFF;
}
```

The result is then stored in big-endian format:
- `buffer[50] = (checksum >> 8) & 0xFF;`
- `buffer[51] = checksum & 0xFF;`

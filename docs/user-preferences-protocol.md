# Attack Shark X11 - User Preferences Protocol (Report 0x0305)

This document details the configuration protocol for user preferences on the Attack Shark X11, specifically focusing on the `0x0305` report.

## HID Report Parameters

- **Request Type**: `0x21` (Set Report)
- **Request ID**: `0x09`
- **Value**: `0x0305`
- **Index**: `0x0002`

## Payload Layout

The payload consists of 13 bytes for Wired mode or 15 bytes for Wireless (Adapter) mode.

| Index | Name | Description |
| :--- | :--- | :--- |
| 0 | Header 1 | `0x05` |
| 1 | Header 2 | `0x0F` |
| 2 | Header 3 | `0x01` |
| 3 | Light Mode | Selects the LED animation mode. |
| 4 | Configuration | Combined byte: `(Deep Sleep Bucket << 4) | (LED Speed & 0x0F)` |
| 5 | Deep Sleep | Encoded deep sleep timer: `0x08 + (Minutes * 0x10)`. |
| 6 | Red | RGB Red component (0-255). |
| 7 | Green | RGB Green component (0-255). |
| 8 | Blue | RGB Blue component (0-255). |
| 9 | Sleep Timer | Sleep timer in half-minutes: `Minutes * 2`. |
| 10 | Debounce | Encoded key response time: `((ms - 4) / 2) + 2`. |
| 11 | State Flag | Dynamic flag based on colors and mode. |
| 12 | Checksum | Sum of bytes from index 3 to 10 (modulo 256). |
| 13-14| Padding | `0x00 0x00` (Wireless mode only). |

---

## Field Details

### 1. Light Modes (Index 3)

| Mode | Hex Value | Description |
| :--- | :--- | :--- |
| Off | `0x00` | LEDs disabled. |
| Static | `0x10` | Fixed color. |
| Breathing | `0x20` | Pulse animation with single color. |
| Neon | `0x30` | Cycling rainbow effect. |
| Color Breathing | `0x40` | Pulse animation cycling through colors. |
| Static DPI | `0x50` | Color based on current DPI stage (Fixed). |
| Breathing DPI | `0x60` | Pulsing color based on current DPI stage. |

### 2. Deep Sleep Configuration (Index 4 & 5)

The mouse enters a deep power-saving mode after a period of inactivity.

- **Minutes Range**: 1 to 60.
- **Index 5 Formula**: `0x08 + (Minutes * 0x10)`
- **Bucket (Index 4 High Nibble)**:
    - `0`: 1 - 16 minutes
    - `1`: 17 - 32 minutes
    - `2`: 33 - 48 minutes
    - `3`: 49 - 60 minutes
    - Formula: `floor((minutes - 1) / 16)`

### 3. LED Speed (Index 4 Low Nibble)

- **Range**: 1 (Slowest) to 5 (Fastest).
- **Hardware Encoding**: The value sent to the device is inverted: `6 - UserSpeed`.
    - Speed 1 (Slowest) -> `5`
    - Speed 5 (Fastest) -> `1`
- **Default**: 3.

### 4. RGB Colors (Index 6, 7, 8)

Used for Static and Breathing modes.
Note: For modes like Neon or Color Breathing, these values might be ignored by the device but are usually sent as default or last used color.

### 5. Sleep Timer (Index 9)

Normal sleep (standby) before deep sleep.
- **Minutes Range**: 0.5 to 30.0.
- **Value**: `Minutes * 2` (e.g., 2 mins = `4`, 0.5 mins = `1`).

### 6. Debounce / Key Response (Index 10)

- **Range**: 4ms to 50ms (Must be an even number).
- **Formula**: `((ms - 4) / 2) + 2`
    - 4ms -> `2`
    - 8ms -> `4`
    - 50ms -> `25`

### 7. State Flag (Index 11)

This byte acts as a status indicator for the firmware.

- **Threshold**: A color component is "active" if it is `>= 100` (`0x64`).
- **Count**: Number of active components (0 to 3).
- **Base Logic**:
    - If Mode is `Breathing DPI` (`0x60`): `State = Count + 1`
    - Otherwise: `State = Count`

### 8. Checksum (Index 12)

Calculated as the sum of bytes from index 3 to 10.
`Checksum = (Byte[3] + Byte[4] + ... + Byte[10]) & 0xFF`

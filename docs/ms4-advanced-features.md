# Advanced Features (It's just speculation for now)

This document details the configuration of advanced sensor features specific to the Attack Shark X11 (MS_4 profile), which are part of the `Report 0x0304` configuration packet.

## 1. Motion Sync
Motion Sync synchronizes the sensor's data reporting with the USB polling interval, resulting in smoother tracking.

- **Offset**: Byte 25
- **Values**:
    - `0x00`: Disabled
    - `0x01`: Enabled
- **Default**: `0x00` (Software usually defaults to Enabled for X11)

## 2. LOD (Lift Off Distance)
Determines the height at which the sensor stops tracking when the mouse is lifted.

- **Offset**: Byte 44
- **Values**:
    - `0x01`: 1.0 mm
    - `0x02`: 2.0 mm
- **Default**: `0x01`

## 3. Debounce Time
The debounced time sets the delay used to prevent "double-clicking" by ignoring later signals for a short period after a click is detected.

- **Offset**: Byte 46
- **Values**:
    - `0x01` to `0x14` (1ms to 20ms)
- **Default**: `0x08` (8ms) or `0x04` (4ms) depending on firmware.

## 4. Integration into DpiBuilder
These features are part of the same 56-byte buffer used for DPI settings. Any change to these values requires a recalculation of the 16-bit checksum (sum of bytes 3 to 49).

### Example Data Fragment (Offsets 24-46)
```text
Offset: 24 25 26 ... 44 45 46
Value:  01 01 00 ... 01 00 04
        ^  ^         ^     ^
        |  |         |     Debounce (4ms)
        |  |         LOD (1mm)
        |  Motion Sync (On)
        Active Stage (1)
```

# Button Mapping

This document explains how to read and write the button mapping configuration for the device.

## Overview

The firmware exposes **18 button configuration slots**. Each slot occupies 3 bytes and stores the action assigned to a
button.

### Slot Structure

Each 3-byte slot is structured as follows:

| Byte | Name                | Description                                                                    |
|------|---------------------|--------------------------------------------------------------------------------|
| 1    | **Firmware Action** | The primary action (e.g., Left Click, Keyboard Macro, DPI Cycle).              |
| 2    | **Modifiers**       | Extra information for the action (e.g., Ctrl, Shift, Alt for keyboard macros). |
| 3    | **Usage ID**        | The specific key or button identifier (e.g., Key Code for keyboard actions).   |

For example, a keyboard macro for `Ctrl + C` would be represented as `0x11, 0x01, 0x06`:

- `0x11`: Firmware Action (Keyboard Macro)
- `0x01`: Modifiers (Ctrl)
- `0x06`: Usage ID (Key 'C')

Many actions (like `0x02` for Left Click) only use the first byte and leave the others as `0x00`.

## Write Operation

To write the button mapping, a 59-byte packet (Report ID `0x08`) is sent to the device.

| Offset | Description           | Default Example    |
|--------|-----------------------|--------------------|
| 0      | Report ID             | `0x08`             |
| 1      | Packet Length         | `0x3b` (59)        |
| 2      | Profile Id            | `0x01`             |
| 3-5    | Slot 1 (Left Click)   | `0x02, 0x00, 0x00` |
| 6-8    | Slot 2 (Right Click)  | `0x03, 0x00, 0x00` |
| 9-11   | Slot 3 (Middle Click) | `0x04, 0x00, 0x00` |
| 12-14  | Slot 4                | `0x01, 0x00, 0x00` |
| 15-17  | Slot 5                | `0x01, 0x00, 0x00` |
| 18-20  | Slot 6 (DPI Cycle)    | `0x0d, 0x00, 0x00` |
| 21-23  | Slot 7 (Forward)      | `0x06, 0x00, 0x00` |
| 24-26  | Slot 8 (Backward)     | `0x05, 0x00, 0x00` |
| 27-29  | Slot 9                | `0x01, 0x00, 0x00` |
| 30-32  | Slot 10               | `0x01, 0x00, 0x00` |
| 33-35  | Slot 11               | `0x01, 0x00, 0x00` |
| 36-38  | Slot 12               | `0x01, 0x00, 0x00` |
| 39-41  | Slot 13               | `0x01, 0x00, 0x00` |
| 42-44  | Slot 14               | `0x01, 0x00, 0x00` |
| 45-47  | Slot 15               | `0x01, 0x00, 0x00` |
| 48-50  | Slot 16               | `0x01, 0x00, 0x00` |
| 51-53  | Slot 17 (Scroll Up)   | `0x09, 0x00, 0x00` |
| 54-56  | Slot 18 (Scroll Down) | `0x0a, 0x00, 0x00` |
| 57-58  | Checksum (16-bit)     | `0x00, 0x3e`       |

### Write Checksum Calculation

The checksum is stored as a big-endian unsigned 16-bit integer (high byte at index 57, low byte at index 58) calculated
as:
`Checksum = (Sum of bytes from index 3 to 56) - 1`

## Read Operation

When reading the button mapping, the device returns the same 59-byte structure, but **the returned slot order differs
from the write order**. The firmware applies an internal mapping, and some slots may be reserved for internal use.

| Offset | Represented Logical Slot | Description                   |
|--------|--------------------------|-------------------------------|
| 0      | -                        | Report ID (`0x08`)            |
| 1      | -                        | Packet Length (`0x3b`)        |
| 2      | -                        | Profile ID                    |
| 3-5    | **Slot 1**               | Logical Slot 1                |
| 6-8    | **Slot 2**               | Logical Slot 2                |
| 9-11   | **Slot 3**               | Logical Slot 3                |
| 12-14  | **Slot 4**               | Logical Slot 4                |
| 15-17  | **Slot 5**               | Logical Slot 5                |
| 18-20  | **Slot 8**               | Logical Slot 8 (Backward)     |
| 21-23  | **Slot 7**               | Logical Slot 7 (Forward)      |
| 24-26  | **Slot 6**               | Logical Slot 6 (DPI Cycle)    |
| 27-29  | **Slot 9**               | Logical Slot 9                |
| 30-32  | **Slot 10**              | Logical Slot 10               |
| 33-35  | **Slot 11**              | Logical Slot 11               |
| 36-38  | **Slot 12**              | Logical Slot 12               |
| 39-41  | **Slot 13**              | Logical Slot 13               |
| 42-44  | **Slot 14**              | Logical Slot 14               |
| 45-47  | **Slot 15**              | Logical Slot 15               |
| 48-50  | **Slot 16**              | Logical Slot 16               |
| 51-53  | **Slot 18**              | Logical Slot 18 (Scroll Down) |
| 54-56  | **Slot 17**              | Logical Slot 17 (Scroll Up)   |
| 57-58  | -                        | Checksum                      |

### Attack Shark X11 Read Mapping

This mapping documents the translation between logical slots and read offsets specifically for the Attack Shark X11.
This mapping may differ between other firmware models.

| Logical Slot | Read Offset |
|--------------|-------------|
| Slot 1       | 3-5         |
| Slot 2       | 6-8         |
| Slot 3       | 9-11        |
| Slot 4       | 12-14       |
| Slot 5       | 15-17       |
| Slot 6       | 24-26       |
| Slot 7       | 21-23       |
| Slot 8       | 18-20       |
| Slot 9       | 27-29       |
| ...          | ...         |
| Slot 17      | 54-56       |
| Slot 18      | 51-53       |

### Read Checksum Calculation

For reading, the checksum is stored as a big-endian unsigned 16-bit integer calculated as the raw sum without the
subtraction:
`Checksum = Sum of bytes from index 3 to 56`

## Important Notes

- **Slot 5**: This slot behaves differently on some devices.
	- At least on the Attack Shark X11, the values saved in this slot are not reliably preserved; I am not sure about
	  the behavior on other models.
	- The returned value may correspond to another internal button mapping instead of the written value.
- **Slot 7**: This slot cannot be disabled in some firmwares. Attempting to disable it (action `0x01`) might cause it to
  revert to its default value.
- **Slot Mapping**: The physical button association is model-dependent.

For a full list of **Firmware Action** and **Usage ID** values, refer to the source code:

- `src/core/keyboard-keypad-page.ts` (Keyboard usages)
- `src/protocols/ButtonMappingBuilder.ts` (Firmware actions)

# Button Mapping

> [!TIP]
> To better understand this document, read the `README.md` located in the root of this directory first.

## Overview

This document explains how to read and write the device's button mapping configuration. The protocol supports up to
18 physical buttons, although no model uses all of them; many of the available buttons remain disabled.

## Structure

The structure consists of **59 bytes** including the Report ID.

| Offset | Description   | Default Example    |
|--------|---------------|--------------------|
| 0      | Report ID     | `0x08`             |
| 1      | Packet Length | `0x3b`             |
| 2      | Profile ID    | `0x01`             |
| 3-5    | Slot 1        | `0x02, 0x00, 0x00` |
| 6-8    | Slot 2        | `0x03, 0x00, 0x00` |
| 9-11   | Slot 3        | `0x04, 0x00, 0x00` |
| 12-14  | Slot 4        | `0x01, 0x00, 0x00` |
| 15-17  | Slot 5        | `0x01, 0x00, 0x00` |
| 18-20  | Slot 6        | `0x0d, 0x00, 0x00` |
| 21-23  | Slot 7        | `0x06, 0x00, 0x00` |
| 24-26  | Slot 8        | `0x05, 0x00, 0x00` |
| 27-29  | Slot 9        | `0x01, 0x00, 0x00` |
| 30-32  | Slot 10       | `0x01, 0x00, 0x00` |
| 33-35  | Slot 11       | `0x01, 0x00, 0x00` |
| 36-38  | Slot 12       | `0x01, 0x00, 0x00` |
| 39-41  | Slot 13       | `0x01, 0x00, 0x00` |
| 42-44  | Slot 14       | `0x01, 0x00, 0x00` |
| 45-47  | Slot 15       | `0x01, 0x00, 0x00` |
| 48-50  | Slot 16       | `0x01, 0x00, 0x00` |
| 51-53  | Slot 17       | `0x09, 0x00, 0x00` |
| 54-56  | Slot 18       | `0x0a, 0x00, 0x00` |
| 57     | Checksum High | `0x00`             |
| 58     | Checksum Low  | `0x3e`             |

## Slot Structure

A slot refers to a 3-byte field within the protocol. As mentioned earlier, the protocol supports up to 18 physical
buttons and therefore provides 18 slots. However, the mapping between physical buttons and slots is defined by the
firmware. Consequently, the slots used by the X11 may differ from those used by another model, even if that model
supports the same protocol.

It is also possible to write to a slot that the firmware does not use. However, because the firmware does not associate
that slot with any physical button, the change has no observable effect. The value is stored, but the slot cannot be
triggered by a physical button.

### Slot Structure

Each slot occupies 3 bytes and follows this structure.

| Byte | Name            | Description                                                   |
|------|-----------------|---------------------------------------------------------------|
| 1    | Firmware Action | Primary action (e.g., Disabled, Left Click, Macro, DPI Cycle) |
| 2    | Modifiers       | Modifiers (e.g., Ctrl, Alt, Shift)                            |
| 3    | Usage ID        | The specific key or button identifier                         |

Only the Firmware Action field is required. The Modifiers and Usage ID fields are optional and can be set to `0x00`.

For example, Left Click is represented as `0x02, 0x00, 0x00`. Here, `0x02` is the Firmware Action (Left Click), which
does not require the Modifiers or Usage ID fields.

A keyboard macro for `Ctrl + C`, on the other hand, is represented as `0x11, 0x01, 0x06`:

- `0x11`: Firmware Action (Keyboard Macro)
- `0x01`: Modifiers (Ctrl)
- `0x06`: Usage ID (Key 'C')

Both the Modifiers and Usage ID fields follow the HID usage definitions documented in the
[HID Usage Tables](https://usb.org/sites/default/files/hut1_7.pdf), under "Keyboard/Keypad Page (0x07)".

For a complete list of **Firmware Actions**, refer to the source code.

## Write and Read Operations

In some cases, the firmware rearranges slot data between write and read operations, so care is required when
interpreting the results. The table below compares the default values written to the X11 with the values returned
by a subsequent read. Notice that some slots appear in different positions and that the readback contains some
unexpected values:

|       | Slot 1   | Slot 2   | Slot 3   | Slot 4   | Slot 5   | Slot 6   | Slot 7   | Slot 8   | Slot 9   | Slot 10  | Slot 11  | Slot 12  | Slot 13  | Slot 14  | Slot 15  | Slot 16  | Slot 17  | Slot 18  |
|-------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Write | `020000` | `030000` | `040000` | `010000` | `010000` | `0d0000` | `060000` | `050000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `090000` | `0a0000` |
| Read  | `020000` | `030000` | `040000` | `010000` | `060000` | `050000` | `3c0000` | `0d0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `0a0000` | `090000` |

This occurs because, at least on the X11 (as noted earlier, the behavior depends on the firmware), some slots are
reordered when read back. Certain slots are also write-protected. For example, slot 7 contains Firmware Action `0x3C`
(Mode Key) and is the only write-protected slot. Allowing this action to be overwritten could cause significant
problems.

To investigate this behavior, I wrote a script that first disables all slots using Firmware Action `0x01`. It then
iterates through all 18 slots, attempting to write Firmware Action `0x02` to one slot at a time and reading back the
result after each write. The table below records these readback results: each row represents one iteration of the
loop, and each column shows the value returned for a particular slot.

| Slots         | Slot 1   | Slot 2   | Slot 3   | Slot 4   | Slot 5   | Slot 6   | Slot 7   | Slot 8   | Slot 9   | Slot 10  | Slot 11  | Slot 12  | Slot 13  | Slot 14  | Slot 15  | Slot 16  | Slot 17  | Slot 18  |
|---------------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Write Slot 1  | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 2  | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 3  | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 4  | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 5  | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 6  | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 7  | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 8  | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 9  | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 10 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 11 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 12 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 13 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 14 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` | `010000` |
| Write Slot 15 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` | `010000` |
| Write Slot 16 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` | `010000` |
| Write Slot 17 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` |
| Write Slot 18 | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `3c0000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `010000` | `020000` | `010000` |

As noted earlier, slot 7 remains write-protected. A script that performs this kind of systematic scan makes it
possible to identify how the firmware maps slots during write and read operations.

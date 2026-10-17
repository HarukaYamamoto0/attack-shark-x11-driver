# Consumer Control

Some button actions, such as opening an email client or controlling media playback, can be handled directly by the
operating system. Instead of sending a proprietary event to the official panel, the Attack Shark X11 uses the standard
USB HID **Consumer Control** collection for these actions.

The examples below were obtained from the **wireless** HID interface. The collection is exposed on Interface `0x02`,
with Usage Page `0x0C` (Consumer) and Usage `0x01` (Consumer Control). Its Input Report has Report ID `0x02`.

The collection identifies where the report comes from; the **Consumer Usage ID** inside the report identifies the
requested action. The operating system may act on that Usage even when the official panel is not running.

## Structure

Each Consumer Control Input Report contains three bytes, including the Report ID:

| Offset | Description | Example |
|--------|-------------|---------|
| 0      | Report ID   | `0x02`  |
| 1      | Low byte    | `0x8A`  |
| 2      | High byte   | `0x01`  |

### Report ID

The value is always `0x02` for this report, as declared in the HID report descriptor.

### Consumer Usage ID

Offsets `1` and `2` form a **16-bit little-endian** value. To parse it, combine the low byte with the high byte shifted
left by eight bits:

`usage = byte[1] | (byte[2] << 8)`

For example, `8A 01` represents `0x018A`, which the USB HID Usage Tables define as **AL Email Reader**. This is a
standard HID identifier, not an Attack Shark-specific command.

A Usage ID of `0x0000` means that no Consumer Control Usage is currently selected. After a non-zero report, the mouse
can send `02 00 00` to indicate that the control is no longer active. A driver that exposes press/release events must
remember the previous non-zero Usage to determine which action was released.

## Example

The following packets were captured after assigning the `EMAIL` Firmware Action (`0x1E`) to a mouse button:

```text
02 8A 01
│  │  └── Consumer Usage ID (high byte): 0x01
│  └───── Consumer Usage ID (low byte):  0x8A
└──────── Report ID: 0x02
```

The resulting Consumer Usage is `0x018A` (**AL Email Reader**). The operating system decides which application, if any,
should respond to it; the packet contains no email address or URL.

A subsequent report was also captured:

```text
02 00 00
│  └────── No active Consumer Usage (0x0000)
└───────── Report ID: 0x02
```

## Firmware Actions and Consumer Usages

**Firmware Actions and Consumer Usages are different identifiers.** The Firmware Action is written through
the [Button Mapping Protocol](../protocols/button-mapping.md); the Consumer Usage is what the mouse sends when that action is
triggered.

| Firmware Action        | Action Code | Consumer Usage | Description     |
|------------------------|-------------|----------------|-----------------|
| `FirmwareAction.EMAIL` | `0x1E`      | `0x018A`       | AL Email Reader |

Other multimedia, browser and application actions are available in the firmware.

## Reading the Reports

To receive these reports, find the HID collection with Usage Page `0x0C` and Usage `0x01` on Interface `0x02`. For each
incoming report with ID `0x02`, read the two bytes after the Report ID as a little-endian Consumer Usage ID.

These are standard HID input reports, not the proprietary messages described elsewhere in this documentation. The
operating system may process them independently of your application. **Receiving a report does not prevent the system
from executing its default action.**

For the definitions of other Consumer Usages, consult the [USB HID Usage Tables](https://www.usb.org/hid).

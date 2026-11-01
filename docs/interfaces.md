# HID Interfaces

The Attack Shark X11 mouse and other compatible mice expose multiple HID collections on **Interface 2**, which are used
to exchange data between the mouse and the host computer.

So far, three communication channels have been identified:

| Channel              | Usage Page | Usage  | Purpose                                                        |
|----------------------|------------|--------|----------------------------------------------------------------|
| **Consumer Control** | `0x0C`     | `0x01` | Standard OS multimedia and application launcher shortcuts.     |
| **Events**           | `0x0A`     | `0x00` | Asynchronous runtime notifications and command execution ACKs. |
| **Commands**         | `0x0B`     | `0x00` | Bidirectional device configuration and querying channel.       |

## Consumer Control

This channel uses the standard HID **Consumer Control** collection to send mouse-triggered actions directly to the
operating system, such as volume control, media playback, email and calculator shortcuts, and browser navigation.

These inputs are handled natively by the operating system without requiring interception by a manufacturer-specific
driver.

For more information about this collection, refer to
the [USB HID specification](https://usb.org/sites/default/files/hut1_7.pdf#page=126).

## Events Interface

A unidirectional communication channel through which the mouse sends asynchronous notifications to the host computer,
reporting runtime conditions and state changes such as battery percentage, charging status, DPI stage changes, and
profile switches.

This channel also carries command execution acknowledgments (`0x50` ACK/NACK).

For details on message payloads and event codes, refer to the [Message Documentation](messages/README.md).

## Command Interface

The primary bidirectional configuration channel used by software to read (`GET_REPORT`) and write (`SET_REPORT`) device
settings, including DPI stages, polling rate, lighting, button mappings, macros, and profiles.

For individual protocol structures and Report IDs, refer to the [Protocols Documentation](protocols/README.md).

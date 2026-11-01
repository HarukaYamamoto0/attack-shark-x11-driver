# Messaging Events

This document describes the messaging system found in the Attack Shark X11 mouse. The same protocol is also used by
several mouse models from other brands. It allows the device to send asynchronous messages to the host through an
interrupt endpoint.

During reverse engineering, I found references indicating that some mouse models may use different packet sizes.
However, since I do not have enough hardware to verify this, this document assumes a packet size of **5 bytes**.

If your device uses a different packet size, please open an issue so this document can be updated.

## Payload Structure

| Offset | Description       |
|--------|-------------------|
| 0      | Report ID: `0x03` |
| 1      | Device ID         |
| 2      | Event code        |
| 3      | Parameter 1       |
| 4      | Parameter 2       |

This structure is used to report different types of events, such as battery status, Feature Report responses, and other
asynchronous notifications.

### Offset 0

This byte contains the HID Report ID used for messaging reports. Its value is always `0x03`.

### Offset 1

This byte identifies the device model. Each mouse model using this protocol has a fixed identifier. For example, the
Attack Shark X11 uses `0x55`. Other models use different values.

### Offset 2

This byte identifies which event is being reported. The meaning of **Parameter 1** and **Parameter 2** depends entirely
on this value. Each event type is documented separately.

### Offset 3

The meaning of this byte depends entirely on the event code (`Offset 2`). Each event defines its own interpretation of
this parameter.

### Offset 4

The meaning of this byte depends entirely on the event code (`Offset 2`). Each event defines its own interpretation of
this parameter.

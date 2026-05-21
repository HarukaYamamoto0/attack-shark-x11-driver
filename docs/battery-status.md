# Battery Status Protocol

This document describes the USB interrupt protocol used to retrieve the battery level from the **Attack Shark X11** mouse. This protocol is specifically active when the device is operating in **Wireless and Bluetooth Mode**.

## Communication Specifications

To receive battery updates, the driver must listen to the following USB interface and endpoint:

- **Interface**: `2`
- **Endpoint**: `0x83` (Interrupt IN)
- **Transfer Type**: Interrupt
- **Polling Interval**: Typically configured to 1 ms or 10 ms depending on the host requirement.

## Data Packet Structure

The device pushes packets automatically. Each report follows a specific 5-byte signature followed by the battery percentage.

| Byte Index | Field       | Value (Hex) | Description                                  |
|------------|-------------|-------------|----------------------------------------------|
| 0          | Report Tag  | `0x03`      | Identifies the type of report (Battery/HID)  |
| 1          | Prefix 1    | `0x55`      | Fixed signature byte                         |
| 2          | Prefix 2    | `0x40`      | Fixed signature byte                         |
| 3          | Prefix 3    | `0x01`      | Fixed signature byte                         |
| 4          | Battery     | `0x00-0x64` | Battery level in decimal (0 to 100%)         |

**Example Payload:**
`03 55 40 01 50` -> `0x50` is `80` in decimal, representing **80% battery**.

## Device Behavior

1.  **Autonomous Emission**: The mouse emits these packets periodically while in wireless mode. No request (`SET_REPORT`) or handshake is required to start the stream.
2.  **Wireless Only**: This protocol is only active on the Wireless Adapter. When connected via USB cable (Wired Mode), battery status is not reported through this specific interrupt endpoint.
3.  **No Polling Command**: Unlike DPI or Polling Rate settings which require sending a command to receive a state, the device pushes the battery level whenever it detects a change or at fixed intervals.
4.  **Charging State**: While charging in wired mode, the device identifies as a different USB product, and the interrupt endpoint on Interface 2 of the adapter (if still plugged) will not receive data from the mouse.

## Implementation Guide (TypeScript)

The following example demonstrates how to correctly filter and parse the battery data using the `node-usb` library:

```typescript
// 1. Claim Interface 2
const iface = device.interface(2);
iface.claim();

// 2. Identify and start polling the Interrupt IN endpoint (0x83)
const endpoint = iface.endpoints.find(e => e.address === 0x83) as InEndpoint;

endpoint.on("data", (data: Buffer) => {
    // Validation: Packet must be at least 5 bytes and match the 03 55 40 01 prefix
    if (data.length >= 5 &&
        data[0] === 0x03 &&
        data[1] === 0x55 &&
        data[2] === 0x40 &&
        data[3] === 0x01) {

        const batteryLevel = data[4];
        console.log(`Battery Level Updated: ${batteryLevel}%`);
    }
});

// Start polling with a 64-byte buffer
endpoint.startPoll(1, 64);
```

## Technical Summary

- **USB Interface**: 2
- **Endpoint Address**: 0x83
- **Data Offset**: `Byte[4]`
- **Format**: Direct Unsigned 8-bit Integer (0–100)
- **Update Frequency**: Event-driven / Periodic

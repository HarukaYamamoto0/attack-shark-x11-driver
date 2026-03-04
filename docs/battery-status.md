# Battery Status Interrupt Protocol (Interface 2 – Endpoint 0x83)

This document describes how to receive battery status updates from the **Attack Shark X11** mouse using the USB interrupt IN endpoint.

Unlike configuration reports (Feature Reports via `SET_REPORT`), battery status is delivered asynchronously through an interrupt endpoint.

## Device Identification

The Attack Shark X11 exposes two Product IDs:

| Mode     | PID      |
|----------|----------|
| Wireless | `0xFA60` |
| Wired    | `0xFA55` |

Vendor ID:

* **VID**: `0x1D57`

Battery reporting is primarily relevant in **Wireless mode**.

## USB Interface and Endpoint

Battery events are emitted on:

* **Interface Index**: `2`
* **Endpoint Address**: `0x83`
* **Endpoint Type**: Interrupt IN

This endpoint pushes reports automatically while the device is operating wirelessly and discharging.

## Packet Structure

Each interrupt transfer returns a small status packet.

Observed packet length: 5 bytes (minimum).

Example (hex):

```
03 55 40 01 64
```

| Index | Field      | Type    | Description                        |
|-------|------------|---------|------------------------------------|
| 0     | Report Tag | `uint8` | Constant value `0x03`              |
| 1     | Unknown    | `uint8` | Observed `0x55`                    |
| 2     | Unknown    | `uint8` | Observed `0x40`                    |
| 3     | Unknown    | `uint8` | Observed `0x01`                    |
| 4     | Battery    | `uint8` | Battery percentage (0–100 decimal) |

## Battery Value

The battery percentage is located at:

```
Byte[4]
```

It is a direct decimal value.

Example:

```
0x64 → 100%
0x32 → 50%
0x0A → 10%
```

No checksum or additional transformation is required.

## Behavior Notes

### 1. Emission Conditions

Battery reports are:

* Emitted automatically while in wireless mode
* Emitted periodically while discharging
* Not emitted while charging (no interrupt events observed)

When charging via cable, the device stops sending interrupt battery packets.

### 2. No Handshake Required

No prior control transfer or feature report is required to enable battery reporting.

Simply:

1. Open device
2. Claim Interface 2
3. Start polling endpoint `0x83`

## Example (libusb / node-usb style)

```typescript
endpoint.startPoll(1, 64);

endpoint.on("data", (data: Buffer) => {
    if (data.length < 5) return;

    const battery = data[4];
    console.log("Battery:", battery + "%");
});
```

## Single Transfer Read (Non-Polling)

It is also possible to read a single battery packet using an interrupt transfer:

```typescript
endpoint.transfer(64, (err, data) => {
    if (err) throw err;

    const battery = data[4];
    console.log("Battery:", battery + "%");
});
```

## Recommended Implementation Pattern

To avoid excessive logging, it is recommended to:

* Store the last known battery value
* Emit updates only when the value changes

Pseudo-logic:

```typescript
if (battery !== lastBattery) {
    lastBattery = battery;
    emit(battery);
}
```

## Summary

* Interface: `2`
* Endpoint: `0x83` (Interrupt IN)
* Battery location: `Byte[4]`
* Value format: Direct percentage (0–100)
* No checksum
* No control transfer required
* Stops emitting while charging (wired mode)
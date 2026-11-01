# Protocols

This directory documents the configuration protocols used by the Attack Shark X11 mouse (and other compatible mice
that share the same firmware family). Each document describes the payload of one **Feature Report**: its layout, its
fields, and how the firmware interprets them.

Before reading the individual documents, it helps to understand **how a command travels from the host to the
mouse**, how the mouse confirms it, and how settings are read back. The individual documents only describe the
*payload*; everything around it is described here.

> [!NOTE]
> All values are hexadecimal unless stated otherwise. Everything in this directory comes from reverse engineering the
> official software and the firmware's behavior. Some details are still not fully understood, and those are marked in
> the respective documents.

## Overview

The mouse is configured through **HID Feature Reports** exchanged over the **Command interface** (Interface 2, Usage
Page `0x0B`). See [`../interfaces.md`](../interfaces.md) for the full list of HID collections.

There are three actors involved in every operation:

| Channel                                   | Direction     | Purpose                                                        |
|-------------------------------------------|---------------|----------------------------------------------------------------|
| **Command interface** (Usage Page `0x0B`) | Host ↔ Device | `SET_REPORT` / `GET_REPORT` Feature Reports (this directory).  |
| **Events interface** (Usage Page `0x0A`)  | Device → Host | Asynchronous notifications, including command acknowledgments. |
| **USB control endpoint (EP0)**            | Host ↔ Device | Physical transport carrying the Feature Report requests.       |

In short:

- **Writing** a setting is a `SET_REPORT` request followed by an asynchronous acknowledgment on the Events interface.
- **Reading** a setting is a three-step handshake (authorize, check, `GET_REPORT`).

## Feature Reports

A Feature Report is identified by a **Report ID**, which is always the **first byte of the payload** (offset `0`).
Every protocol document in this directory starts its offset table with that byte.

The main Report IDs known so far are:

| Report ID | Description                    | Document                                                         |
|----------:|--------------------------------|------------------------------------------------------------------|
|    `0x04` | DPI                            | [`dpi-protocol.md`](./dpi-protocol.md)                           |
|    `0x05` | User preferences / lighting    | [`user-preferences-protocol.md`](./user-preferences-protocol.md) |
|    `0x06` | Polling rate                   | [`polling-rate.md`](./polling-rate.md)                           |
|    `0x07` | Wake-up mode                   | [`unmapped-protocols.md`](./unmapped-protocols.md)               |
|    `0x08` | Button mapping                 | [`button-mapping.md`](./button-mapping.md)                       |
|    `0x09` | Macro                          | [`custom-macro-protocol.md`](./custom-macro-protocol.md)         |
|    `0x0A` | Read profile                   | [`unmapped-protocols.md`](./unmapped-protocols.md)               |
|    `0x0B` | Device version                 | [`unmapped-protocols.md`](./unmapped-protocols.md)               |
|    `0x0C` | Profile settings               | [`profile-settings.md`](./profile-settings.md)                   |
|    `0xA0` | Read authorization (handshake) | [`report-id-reading.md`](./report-id-reading.md)                 |

Report IDs that were observed but are not yet understood are listed in
[`unmapped-protocols.md`](./unmapped-protocols.md).

> [!CAUTION]
> Never send or read Report ID `0x10`. It makes the firmware store a bootloader flag and reboot into the Beken USB
> bootloader. See [`unmapped-protocols.md`](./unmapped-protocols.md).

## Sending a Command (Write)

### 1. Build the payload

Every writing payload follows the same general shape:

| Offset | Description                                                              |
|--------|--------------------------------------------------------------------------|
| 0      | Report ID                                                                |
| 1      | Packet length (total payload length in bytes, including the Report ID)   |
| 2…n    | Report-specific fields (profile ID, values, etc.)                        |
| …      | Checksum (when the report defines one; its algorithm differs per report) |
| …      | Padding (`0x00`) up to the packet length                                 |

For example, the polling rate command is a 9-byte payload:

```hex
06 09 01 01 FE 00 00 00 00
│  │  │  │  │  └──────────── Padding
│  │  │  │  └─────────────── Checksum (0xFF - polling rate)
│  │  │  └────────────────── Polling rate value (1000 Hz)
│  │  └───────────────────── Profile ID
│  └──────────────────────── Packet length
└─────────────────────────── Report ID
```

The payload length is fixed for each Report ID. If the length or the checksum is wrong, the firmware rejects the
command (see [Wait for the acknowledgment](#3-wait-for-the-acknowledgment)).

Some payloads depend on the **connection mode** (wired USB cable or 2.4 GHz wireless receiver). The mouse exposes
different USB Product IDs for each mode, and the driver passes the active mode to every payload builder. Each document
states whether its payload differs between modes; for the polling rate, for example, the structure is identical in
both.

### 2. Send it as a Feature Report

The payload is transmitted with a standard HID `SET_REPORT` request of type *Feature*. At the USB level, this is a
control transfer on the default endpoint:

| Field           | Value                                                        |
|-----------------|--------------------------------------------------------------|
| `bmRequestType` | `0x21` (Host-to-Device, Class, Interface)                    |
| `bRequest`      | `0x09` (`SET_REPORT`)                                        |
| `wValue`        | `0x0300 \| Report ID` (Report Type = Feature, e.g. `0x0306`) |
| `wIndex`        | `0x0002` (Interface 2)                                       |
| Data            | The full payload, **including** the Report ID as first byte  |

Most HID libraries (such as `node-hid`, used by this driver) build this request for you: you pass the full buffer
(Report ID first) to their `sendFeatureReport` function, and the library fills in `wValue` and `wIndex` from the
buffer and the opened interface.

### 3. Wait for the acknowledgment

The USB `ACK` handshake only means the transfer reached the device. It does **not** mean the firmware accepted the
settings. The firmware validates the payload afterward and reports the result **asynchronously** on the Events
interface with a *Command Acknowledgment* message (event code `0x50`):

```text
HOST                                  DEVICE
 │                                      │
 │  SET_REPORT Feature (Report 0x06)    │
 │─────────────────────────────────────>│
 │<──────────── USB ACK ────────────────│
 │                                      │
 │        firmware validates payload    │
 │                                      │
 │  Interrupt IN: 03 55 50 00 06        │
 │<─────────────────────────────────────│
 │                                      │
```

The acknowledgment contains a status (`0x00` success, `0x01` failure) and the Report ID of the command it refers to.
The format is described in [`../messages/command-acknowledgment.md`](../messages/command-acknowledgment.md), and the
general format of Events messages in [`../messages/README.md`](../messages/README.md).

### Acknowledgment rules followed by the driver

The firmware does not provide any sequence number, so the Report ID in the acknowledgment is the **only** way to match
a response to its request. To keep this reliable, the driver follows these rules:

- **One command at a time.** A new command is not sent while another one is still waiting for its acknowledgment.
  Commands must be serialized.
- **Timeout.** If no acknowledgment arrives in time (the driver defaults to 1 second), the command is considered
  failed. The official software handles this by retrying the command.
- **Report ID matching.** An acknowledgment whose Report ID does not match the pending command indicates something is
  wrong (for example, a stale or unexpected message).
- **Failure carries no reason.** A status of `0x01` does not say *why* the command was rejected (invalid checksum,
  unsupported value, wrong length, etc.). Double-check the payload against the protocol document.

### Multi-packet commands

Some settings do not fit in a single packet. The macro protocol, for instance, uses **three consecutive
`SET_REPORT` packets** with the same Report ID (`0x09`), one per page. Each packet is acknowledged individually, so the
host must wait for the acknowledgment of one page before sending the next. See
[`custom-macro-protocol.md`](./custom-macro-protocol.md).

### Applying settings to a profile

Most reports carry a **Profile ID** field. This selects which of the mouse's profiles (up to 5) the setting applies
to. Profile selection and the profile-related commands are described in
[`profile-settings.md`](./profile-settings.md).

## Reading a Setting (Read)

Reading is **not** a simple `GET_REPORT`. A `GET_REPORT` issued without preparation returns arbitrary or invalid data.
The firmware requires a single-use authorization through Report ID `0xA0`:

```text
HOST                                  DEVICE
 │                                      │
 │  SET_REPORT  0xA0 (request read)     │   1. Request read access
 │─────────────────────────────────────>│      (target Report ID, expected length, parameter)
 │                                      │
 │  GET_REPORT  0xA0                    │   2. Check read access
 │─────────────────────────────────────>│
 │<───────── A0 01 00 00 00 00 00 ──────│      (byte 1 = 0x01 → granted)
 │                                      │
 │  GET_REPORT  <target Report ID>      │   3. Read the target report
 │─────────────────────────────────────>│
 │<───────── report payload ────────────│
 │                                      │
```

The `GET_REPORT` request uses:

| Field           | Value                                         |
|-----------------|-----------------------------------------------|
| `bmRequestType` | `0xA1` (Device-to-Host, Class, Interface)     |
| `bRequest`      | `0x01` (`GET_REPORT`)                         |
| `wValue`        | `0x0300 \| Report ID` (Report Type = Feature) |
| `wIndex`        | `0x0002` (Interface 2)                        |
| `wLength`       | Expected response length of the target report |

Important points:

- The authorization is **consumed by a single read**. Every read needs a new authorization.
- The request must declare the **expected response length** of the target report. Each protocol document lists it, and
  a wrong value makes the mouse reject the request.
- The authorization request has a report-specific **parameter** (for example, a Profile ID or a Macro ID).
- Reads must be **serialized**; the authorization state is shared by the whole device.
- Reading does **not** use the acknowledgment mechanism described above: the data is returned directly in the
  `GET_REPORT` response.

The complete procedure is documented in [`report-id-reading.md`](./report-id-reading.md).

## Reading Order

If you are new to this directory, the suggested reading order is:

1. [`../interfaces.md`](../interfaces.md): which HID collection carries what.
2. This document: how commands are sent, acknowledged, and read.
3. [`../messages/README.md`](../messages/README.md) and
   [`../messages/command-acknowledgment.md`](../messages/command-acknowledgment.md): the asynchronous replies.
4. [`report-id-reading.md`](./report-id-reading.md): the read handshake in detail.
5. The individual protocol documents for the settings you are interested in.

[//]: # (TODO: explicar Nibble Packing)

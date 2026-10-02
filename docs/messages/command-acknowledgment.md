# Command Acknowledgment

> To better understand this document, read the `README.md` located in the root of this directory first.

This event is an acknowledgment sent by the firmware after a command has been processed.

It should not be confused with the native USB ACK mechanism. A USB ACK only confirms that the USB transaction itself
was successfully received. The firmware may still reject the command afterward, for example, because of an invalid
checksum or an unsupported parameter.

In that case, the device reports the command result asynchronously through the Interrupt IN endpoint.

The flow is approximate:

```text
HOST                                  DEVICE
 │                                      │
 │  SET_REPORT Feature                  │
 │─────────────────────────────────────>│
 │                                      │
 │        USB transaction succeeds      │
 │<──────────── USB ACK ────────────────│
 │                                      │
 │        firmware processes command    │
 │                 ...                  │
 │                                      │
 │  Interrupt IN: 03 55 50 00 04        │
 │<─────────────────────────────────────│
 │                                      │
```

## Structure

| Event Code | Param 1     | Param 2           |
|------------|-------------|-------------------|
| `0x50`     | `0x00-0x01` | Feature Report ID |

### Event Code

The event code for command acknowledgments is always `0x50`.

### Param 1

This byte indicates whether the command was accepted or rejected:

| Value  | Description |
|--------|-------------|
| `0x00` | Success     |
| `0x01` | Failure     |

A value of `0x01` indicates that the operation failed. The protocol does not provide any additional error information,
so it is not possible to determine the exact reason for the failure from this event alone.

### Param 2

Contains the Feature Report ID associated with the acknowledgment.

This allows the host application to correlate the response with the original Feature Report request.

## Example

If the host sends Feature Report `0x06` (Polling Rate), the device may respond with:

```text
03 55 50 00 06
│  │  │  │  └── Feature Report ID (Polling Rate)
│  │  │  └───── Status: Success
│  │  └──────── Event Code: 0x50
│  └─────────── Device ID
└────────────── Report ID
```

If the operation fails, the device may instead report:

```text
03 55 50 01 06
│  │  │  │  └── Feature Report ID (Polling Rate)
│  │  │  └───── Status: Failure
│  │  └──────── Event Code: 0x50
│  └─────────── Device ID
└────────────── Report ID
```

## Notes

There are still some unexplained events documented in [`unknown-events.md`](./unknown-events.md).

From the observed behavior of the official software, it appears to wait specifically for this acknowledgment after
sending a command. If the expected acknowledgment is not received, the software simply retries the command.

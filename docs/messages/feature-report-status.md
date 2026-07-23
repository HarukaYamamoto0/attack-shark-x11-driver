# Feature Report Status

> To better understand this document, read the `README.md` located in the root of this directory first.

This event is sent by the device after processing a HID Feature Report request. It allows the host to determine whether
the operation completed successfully and identifies which Feature Report the status refers to.

Unlike the Feature Report itself, this event does not contain the requested data. It only reports the execution status
of the operation.

## Structure

| event code | params1 | params2           |
|------------|---------|-------------------|
| `0x50`     | Status  | Feature Report ID |

## event code

The event code for a Feature Report status notification is always `0x50`.

Whenever the firmware finishes processing a Feature Report request, it sends this event through the interrupt endpoint.

## params1

Represents the execution status of the Feature Report.

| Value  | Description |
|--------|-------------|
| `0x00` | Success     |
| `0x01` | Failed      |

A value of `0x00` indicates that the Feature Report was successfully processed by the firmware.

A value of `0x01` indicates that the operation failed. The protocol does not provide additional error information,
making it impossible to determine the exact reason for the failure.

## params2

Contains the Feature Report ID associated with this status notification.

This allows the host application to correlate the status event with the original Feature Report request.

## Example

If the host sends Feature Report `0x06` (Polling Rate), the device may respond with:

```text
03 55 50 01 06
```

| Byte | Value  | Description                      |
|------|--------|----------------------------------|
| 0    | `0x03` | Message event opcode             |
| 1    | `0x55` | Device ID (Attack Shark X11)     |
| 2    | `0x50` | Feature Report Status            |
| 3    | `0x00` | Operation completed successfully |
| 4    | `0x06` | Feature Report ID (Polling Rate) |

Likewise, if the operation fails, the device reports:

```text
03 55 50 01 06
```

where `0x01` indicates that Feature Report `0x06` could not be processed successfully.

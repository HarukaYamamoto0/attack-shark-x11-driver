# DPI Cycle

> To better understand this document, read the `README.md` located in the root of this directory first.

This event is emitted when certain mouse button macros related to DPI control are triggered. Known macros capable of
emitting this event include:

- DPI Cycle
- DPI+
- DPI-

When one of these macros is executed, the firmware not only changes the active DPI stage but also emits this event to
notify the official software that the DPI configuration has changed. The software can then update its interface to
reflect the newly selected DPI stage.

## Structure

| Event Code | Param 1     | Param 2        |
|------------|-------------|----------------|
| `0x10`     | `0x01-0x08` | `0x00` (fixed) |

### Event Code

Identifies the DPI Cycle event. Its value is always `0x10`.

### Param 1

Indicates the newly selected DPI stage.

| Value  | Description |
|--------|-------------|
| `0x01` | Stage 1     |
| `0x02` | Stage 2     |
| `0x03` | Stage 3     |
| `0x04` | Stage 4     |
| `0x05` | Stage 5     |
| `0x06` | Stage 6     |
| `0x07` | Stage 7     |
| `0x08` | Stage 8     |

### Param 2

Fixed value `0x00`. No captured samples have been found that provide any meaningful interpretation for this field.

## Example

```text
03 55 10 02 00
│  │  │  │  └── Fixed
│  │  │  └───── Stage: 2
│  │  └──────── Event Code: 0x10
│  └─────────── Device ID
└────────────── Report ID
```

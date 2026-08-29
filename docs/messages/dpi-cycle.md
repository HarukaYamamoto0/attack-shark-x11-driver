# DPI Cycle

> To better understand this document, read the `README.md` located in the root of this directory first.

It was observed on the Attack Shark X11 that the mouse sends this event whenever the DPI Cycle macro is triggered by clicking it.

It is also triggered by the DPI+ and DPI- events.

## Structure

| event code | params1 | params2      |
|------------|---------|--------------|
| 0x10       | 0x20    | 0x00 (fixed) |

### event code

Fixed value `0x10`.

### params1

Indicates the desired stage.

| Value | Description |
|-------|-------------|
| 0x01  | Stage 1     |
| 0x02  | Stage 2     |
| 0x03  | Stage 3     |
| 0x04  | Stage 4     |
| 0x05  | Stage 5     |
| 0x06  | Stage 6     |
| 0x07  | Stage 7     |
| 0x08  | Stage 8     |

### params2

Fixed value `0x00`. No dump was found that could provide any meaningful interpretation of this value.

## Example

```text
03 55 10 02 00

03    Event Message opcode
55    Device ID (Attack Shark X11)
10    DPI Cycle Message
02    Stage = 2
00    Fixed

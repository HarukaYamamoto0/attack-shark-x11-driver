# Launch Program

> To better understand this document, read the `README.md` located in the root of this directory first.

This event is sent whenever a button assigned to the firmware action `0x13` (`LAUNCH_PROGRAM`) is pressed or released.

The main purpose of this event is to launch programs. However, the event itself is quite limited, as it only indicates
which button was pressed. One way to implement this functionality would be to maintain a mapping between buttons and
programs.

Your application would listen for this event, and whenever it is triggered, check which program the user has mapped to
the corresponding button and then launch that program.

## Structure

| Event Code | Param 1      | Param 2      |
|------------|--------------|--------------|
| `0x30`     | Button Index | Button State |

### Event Code

Fixed value `0x30`.

### Param 1

Indicates which button is being pressed. See the table below.

| Slot    | Value     | Physical Button |
|---------|-----------|-----------------|
| Slot 1  | `0x01`    | Left            |
| Slot 2  | `0x02`    | Right           |
| Slot 3  | `0x03`    | Middle          |
| Slot 4  | `unknown` |                 |
| Slot 5  | `unknown` |                 |
| Slot 6  | `0x08`    | DPI Cycle       |
| Slot 7  | `0x05`    | Forward         |
| Slot 8  | `0x06`    | Backward        |
| Slot 9  | `unknown` |                 |
| Slot 10 | `unknown` |                 |
| Slot 11 | `unknown` |                 |
| Slot 12 | `unknown` |                 |
| Slot 13 | `unknown` |                 |
| Slot 14 | `unknown` |                 |
| Slot 15 | `unknown` |                 |
| Slot 16 | `unknown` |                 |
| Slot 17 | `0x12`    | Scroll Up       |
| Slot 18 | `0x11`    | Scroll Down     |

### Param 2

Indicates the current state of the button.

| Value  | Description |
|--------|-------------|
| `0x00` | Pressed     |
| `0x01` | Released    |

## Example

```text
03 00 30 06 01
│  │  │  │  └── Button State: Released
│  │  │  └───── Button Index: DPI Cycle
│  │  └──────── Event Code: 0x30
│  └─────────── Fixed
└────────────── Report ID
```

## Notes

Unlike other events, this event does not include the Device ID.

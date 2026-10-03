# Button Event

> To better understand this document, read the `README.md` located in the root of this directory first.

This event tells the PC that a button was pressed or released. The mouse only sends it for a button set to
`FirmwareAction.REPORT_BUTTON` (`0x13`). That action does nothing else, it's only there to report the button.

> **Not checked on a real mouse yet.** This comes from reading the X11's firmware (the code for action `0x13`).
> Nobody has seen this event come off a real X11, so the first run settles it: `scripts/hold-switch.ts run` prints
> every event that arrives.

## Structure

| event code | params1 | params2           |
|------------|---------|-------------------|
| 0x30       | button  | 0x01 / 0x00       |

### event code

Fixed value `0x30`.

### params1

Which button, as the firmware numbers it: its position in the firmware's own button table, counted from 1. That
table may not be in the order you write the slots in (see [button-mapping.md](../protocols/button-mapping.md)), so
this may not match the slot number. With only one button set to `REPORT_BUTTON` you don't need to know it.

### params2

`0x01` when the button is pressed, `0x00` when it's released.

## Example

```text
03 00 30 08 01
03 00 30 08 00

03    Event Message opcode
00    Device ID (this event has 00 here instead of 55, like the 0x20 and 0x90 events)
30    Button Event
08    Button 8
01    Pressed (then 00 when released)
```

The driver's `handleData` doesn't look at byte 1, so the `00` doesn't matter to it.

## Using it

- `driver.on('buttonEvent', (id, pressed) => ...)` gets these.
- `driver.startHoldSwitch()` uses the press and the release to time a hold, see
  [profile-settings.md](../protocols/profile-settings.md#hold-a-button-to-switch-profile).

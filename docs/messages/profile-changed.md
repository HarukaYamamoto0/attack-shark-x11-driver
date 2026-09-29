# Profile Changed

> To better understand this document, read the `README.md` located in the root of this directory first.

This event is emitted whenever the active profile is changed.

This event is normally triggered by macros associated with profiles; if you use a Report ID to switch between macros, it
is not triggered.

## Structure

| event code | params1 | params2      |
|------------|---------|--------------|
| 0x80       | 0x01    | 0x00 (fixed) |

### event code

Fixed value `0x80`.

### params1

Indicates the active profile.

| Value | Description |
|-------|-------------|
| 0x00  | Stage 1     |
| 0x01  | Stage 2     |
| 0x02  | Stage 3     |
| 0x03  | Stage 4     |
| 0x04  | Stage 5     |

As mentioned in the other profile-related documents, the maximum known safe number of profiles is 5. Using profile
values beyond this range may result in undefined or otherwise unpredictable device behavior.

### params2

Fixed value `0x00`. No dump was found that could provide any meaningful interpretation of this value.

## Example

```text
03 55 80 02 00

03    Event Message opcode
55    Device ID (Attack Shark X11)
80    Profile Changed Message
02    Profile = 3
00    Fixed
```

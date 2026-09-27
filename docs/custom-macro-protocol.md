# Custom Macro Communication Protocol (Report 0x09 / 0x08)

This document describes the USB HID communication protocol used to configure, write, and read custom macros for the Attack Shark X11 mouse, as implemented in `MacroBuilder`, `MacroAction`, and `handleMacroResponse`.

## Overview

Configuring and executing custom macros involves three main operations:

1. **Macro Definition (Write Operation)**: Sending 3 USB HID `SET_REPORT` packets (Report ID `0x09` / `wValue: 0x0309`) containing the macro settings, Gun RGB color, playback mode, loop iterations, UTF-8 macro name, action sequence (up to 100 bytes of actions), and a 16-bit validation checksum across 3 pages (`0x00`, `0x01`, `0x02`).
2. **Button Assignment**: Binding a mouse button/slot to execute the configured macro ID using the Button Mapping protocol (Report ID `0x08` / `wValue: 0x0308`) with firmware action `0x12` (`FirmwareAction.CUSTOM_MACRO`).
3. **Macro Reading (Read Operation)**: Reading an existing macro back from the mouse using a USB HID `GET_REPORT` request (Report ID `0x09` / 131 bytes) and validating the received checksum.

## USB HID Request Parameters

### Write Macro Request (`SET_REPORT`)
- **bmRequestType**: `0x21` (Host-to-Device, Class-specific, Interface)
- **bRequest**: `0x09` (SET_REPORT)
- **wValue**: `0x0309` (Report Type: Feature, Report ID: `0x09` / `ReportId.MACRO`)
- **wIndex**: `2` (Interface index)
- **Payload size**: 64 bytes (`0x40`) per packet (3 packets total)

### Read Macro Request (`GET_REPORT`)
- **bmRequestType**: `0xA1` (Device-to-Host, Class-specific, Interface)
- **bRequest**: `0x01` (GET_REPORT)
- **wValue**: `0x0300 | macroId` (Report Type: Feature, e.g. `0x0308` for Macro ID 8)
- **wIndex**: `2` (Interface index)
- **Response size**: 131 bytes (`0x83` / `ReportReadLength.MACRO`)

### Button Mapping Request (`SET_REPORT`)
- **bmRequestType**: `0x21` (Host-to-Device, Class-specific, Interface)
- **bRequest**: `0x09` (SET_REPORT)
- **wValue**: `0x0308` (Report Type: Feature, Report ID: `0x08` / `ReportId.BUTTON_MAPPING`)
- **wIndex**: `2` (Interface index)
- **Payload size**: 59 bytes (`0x3B`)

## Write Operation (Configuring a Macro)

Saving a macro requires sending **3 sequential packets** of 64 bytes each with Report ID `0x09`, corresponding to Pages 0, 1, and 2.

### Packet 1: Page 0 (Header, Metadata & Initial Actions)
Contains general macro settings, Gun RGB color, loop settings, UTF-8 macro name, total action count, and the first 34 bytes of macro actions.

- **wValue**: `0x0309`
- **Payload size**: 64 bytes
- **Page Index**: `0x00` (`MacroPages.First`)

| Offset | Field | Type | Description |
|:---|:---|:---|:---|
| 0 | Report ID | `uint8` | Fixed value `0x09` (`ReportId.MACRO`) |
| 1 | Packet Length | `uint8` | Fixed value `0x40` (64 bytes) |
| 2 | Macro ID | `uint8` | Target Macro ID (`0x00` - `0xFF`, e.g., `0x01` or `0x08`) |
| 3 | Page Index | `uint8` | Fixed value `0x00` (`MacroPages.First`) |
| 4 | Macro Type / Playback Mode | `uint8` | Playback mode: `0x00` (Fixed Loop), `0x01` (Until Key Press), `0x02` (While Pressed) |
| 5 | Gun RGB - Red | `uint8` | Macro Gun RGB indicator Red component (`0x00` - `0xFF`) |
| 6 | Gun RGB - Green | `uint8` | Macro Gun RGB indicator Green component (`0x00` - `0xFF`) |
| 7 | Gun RGB - Blue | `uint8` | Macro Gun RGB indicator Blue component (`0x00` - `0xFF`) |
| 8 | Loop Times | `uint8` | Repeat count when `MacroType` is `FIXED_LOOP` (`0x00`) |
| 9-28 | Macro Name | `uint8[20]` | Macro name encoded in UTF-8 (fixed 20 bytes, null-padded) |
| 29 | Macro Action Count | `uint8` | Total action count (standard actions = 1, extended actions = 2) |
| 30-63 | Macro Actions (Page 0) | `uint8[34]` | First 34 bytes of the 100-byte actions buffer |

### Packet 2: Page 1 (Actions Continuation)
Contains the continuation of the macro actions sequence.

- **wValue**: `0x0309`
- **Payload size**: 64 bytes
- **Page Index**: `0x01` (`MacroPages.Second`)

| Offset | Field | Type | Description |
|:---|:---|:---|:---|
| 0 | Report ID | `uint8` | Fixed value `0x09` (`ReportId.MACRO`) |
| 1 | Packet Length | `uint8` | Fixed value `0x40` (64 bytes) |
| 2 | Macro ID | `uint8` | Target Macro ID (must match Page 0) |
| 3 | Page Index | `uint8` | Fixed value `0x01` (`MacroPages.Second`) |
| 4-63 | Macro Actions (Page 1) | `uint8[60]` | Next 60 bytes of the actions buffer (bytes 34 to 93) |

### Packet 3: Page 2 (Final Actions & Validation Checksum)
Contains the final 6 bytes of the actions buffer and the 16-bit validation checksum.

- **wValue**: `0x0309`
- **Payload size**: 64 bytes
- **Page Index**: `0x02` (`MacroPages.Third`)

| Offset | Field | Type | Description |
|:---|:---|:---|:---|
| 0 | Report ID | `uint8` | Fixed value `0x09` (`ReportId.MACRO`) |
| 1 | Packet Length | `uint8` | Fixed value `0x40` (64 bytes) |
| 2 | Macro ID | `uint8` | Target Macro ID (must match Page 0) |
| 3 | Page Index | `uint8` | Fixed value `0x02` (`MacroPages.Third`) |
| 4-9 | Macro Actions (Page 2) | `uint8[6]` | Final 6 bytes of the actions buffer (bytes 94 to 99) |
| 10-11 | Checksum | `uint16` | 16-bit Checksum in **Big Endian** format (Offset 10: High byte, Offset 11: Low byte) |
| 12-63 | Padding | `uint8[52]` | Unused bytes, padded with `0x00` |

## Playback Modes (`MacroType`)

The device supports 3 macro playback modes configured at Offset 4 of Packet 1:

| Mode Value | Enum Name | Description |
|:---|:---|:---|
| `0x00` | `MacroType.FIXED_LOOP` | Repeats the macro sequence for N iterations specified by `Loop Times` (Offset 8). |
| `0x01` | `MacroType.UNTIL_KEY_PRESS` | Repeats the macro continuously until any mouse button or keyboard key is pressed. |
| `0x02` | `MacroType.WHILE_PRESSED` | Repeats the macro continuously while the bound button is held down; stops immediately on release. |

## Macro Action Encoding (`MacroAction`)

The macro sequence supports keyboard key events and mouse button events with millisecond delays (10 ms to 50,000 ms, resolved in 10 ms increments: `Math.floor(delayMs / 10) * 10`).

The total reserved actions buffer capacity is **100 bytes** (34 bytes on Page 0 + 60 bytes on Page 1 + 6 bytes on Page 2).

An action can be encoded as either a **Standard 2-byte Action** (delay <= 1270 ms) or an **Extended 4-byte Action** (delay > 1270 ms).

### Action Direction Flag
- `MacroActionDirection.Pressed` = `0b00000000` (`0x00`)
- `MacroActionDirection.Release` = `0b10000000` (`0x80`)

### 1. Standard 2-byte Action (Delay <= 1270 ms)
When the delay units `delayUnits = delayMs / 10` is `<= 127` (`0x7F`):

| Byte | Field | Description |
|:---|:---|:---|
| 0 | Direction & Delay | **Bit 7 (`0x80`)**: Direction (`0` = Pressed, `1` = Release)<br>**Bits 0-6 (`0x7F`)**: Delay in 10 ms units (`delayMs / 10`) |
| 1 | Key / Mouse Code | Standard USB HID Keyboard Usage ID or Mouse Code (`0xF1`-`0xF5`) |

### 2. Extended 4-byte Action (Delay > 1270 ms to 50,000 ms)
When the delay units `delayUnits > 0x7F`, the delay is split into 200 ms blocks and the remainder:
- `blocks = Math.floor(delayMs / 200)` (up to 250 blocks for 50,000 ms)
- `remainderMs = delayMs % 200`
- `remainderUnits = remainderMs / 10` (0 to 19 units)

| Byte | Field | Description |
|:---|:---|:---|
| 0 | Direction & Remainder Delay | **Bit 7 (`0x80`)**: Direction (`0` = Pressed, `1` = Release)<br>**Bits 0-6 (`0x7F`)**: Remainder delay units (`remainderUnits`) |
| 1 | Key / Mouse Code | Standard USB HID Keyboard Usage ID or Mouse Code (`0xF1`-`0xF5`) |
| 2 | Extended Delay Blocks | Number of 200 ms blocks (`blocks`) |
| 3 | Extended Flag | Fixed marker `0x03` (`EXTENDED_BYTE_FLAG`) |

### Action Count Increment
In Packet 1 (Page 0) at Offset 29 (`Macro Action Count`):
- Each standard 2-byte action increments the count by `1`.
- Each extended 4-byte action increments the count by `2`.

### Mouse Action Codes (`MacroActionMouseCode`)

| Mouse Action | Value | Description |
|:---|:---|:---|
| `LEFT_BUTTON` | `0xF1` | Mouse Left Click |
| `RIGHT_BUTTON` | `0xF2` | Mouse Right Click |
| `MIDDLE_BUTTON` | `0xF3` | Mouse Middle Click (Wheel Click) |
| `BACK_BUTTON` | `0xF4` | Mouse Backward Button (Extra Button 4 / Side Back) |
| `FORWARD_BUTTON` | `0xF5` | Mouse Forward Button (Extra Button 5 / Side Forward) |

## Write Checksum Calculation

The writing checksum placed in Packet 3 (Page 2) at offsets 10–11 is calculated by summing:
1. All bytes of **Packet 1** (Page 0) from index 4 to 63 (`offset 4..63`).
2. All bytes of **Packet 2** (Page 1) from index 4 to 63 (`offset 4..63`).
3. Action bytes of **Packet 3** (Page 2) from index 4 to 8 (`offset 4..8`).

```typescript
function calculateChecksum(packet1: Uint8Array, packet2: Uint8Array, packet3: Uint8Array): number {
    let checksum = 0x0000;

    for (let i = 4; i < packet1.length; i++) {
        checksum += packet1[i];
    }

    for (let i = 4; i < packet2.length; i++) {
        checksum += packet2[i];
    }

    for (let i = 4; i < 9; i++) {
        checksum += packet3[i];
    }

    return checksum & 0xFFFF;
}
```

The resulting 16-bit integer is written to **Packet 3** at offsets 10 and 11 in **Big Endian** format:
- Offset 10: `(checksum >> 8) & 0xFF` (MSB)
- Offset 11: `checksum & 0xFF` (LSB)

## Read Operation (`handleMacroResponse`)

To read a saved macro configuration from the device, the host sends a `GET_REPORT` Feature request with the target Macro ID. The mouse responds with a **131-byte** buffer (`ReportReadLength.MACRO` = `0x83`).

### 131-Byte Response Layout

| Offset | Field | Type | Description |
|:---|:---|:---|:---|
| 0 | Report ID | `uint8` | Fixed value `0x09` (`ReportId.MACRO`) |
| 1 | Packet Length | `uint8` | Length indicator (`0x40`) |
| 2 | Macro ID | `uint8` | ID of the returned macro |
| 3 | Macro Type | `uint8` | Playback mode (`0x00` = Fixed Loop, `0x01` = Until Key Press, `0x02` = While Pressed) |
| 4 | Gun RGB - Red | `uint8` | Red component of macro RGB (`0x00` - `0xFF`) |
| 5 | Gun RGB - Green | `uint8` | Green component of macro RGB (`0x00` - `0xFF`) |
| 6 | Gun RGB - Blue | `uint8` | Blue component of macro RGB (`0x00` - `0xFF`) |
| 7 | Loop Times | `uint8` | Number of loops configured |
| 8-27 | Macro Name | `uint8[20]` | Macro name encoded in UTF-8 (20 bytes, null-padded) |
| 28 | Macro Action Count | `uint8` | Total action count/slots |
| 29-128 | Macro Actions | `uint8[100]` | Continuous buffer containing all encoded macro actions |
| 129-130 | Checksum | `uint16` | 16-bit Checksum in **Little Endian** format |

### Read Checksum Verification
The checksum in the read response is verified by summing all bytes from offset 3 to offset 128 (inclusive):

```typescript
function verifyReadChecksum(buffer: Uint8Array): boolean {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const checksumByte = view.getUint16(129, true); // true = Little Endian

    let checksum = 0x00;
    for (let i = 3; i <= 128; i++) {
        checksum += view.getUint8(i);
    }

    return checksum === checksumByte;
}
```

### Response Actions Decoding Algorithm
The actions buffer (offsets 29 to 128) is parsed sequentially:

```typescript
const actions: MacroAction[] = [];
const actionsBuffer = buffer.subarray(29, 129);
const view = new DataView(actionsBuffer.buffer, actionsBuffer.byteOffset, actionsBuffer.byteLength);

for (let i = 0; i < actionsBuffer.length; i) {
    const delayAndAction = view.getUint8(i);
    const keyCode = view.getUint8(i + 1);
    const extendedDelay = view.getUint8(i + 2);
    const extendedFlag = view.getUint8(i + 3);

    // End of macro actions marker
    if (delayAndAction === 0x00 && keyCode === 0x00) break;

    const direction = (delayAndAction & 0x80)
        ? MacroActionDirection.Release
        : MacroActionDirection.Pressed;

    let delay = (delayAndAction & 0x7F) * 10; // Base delay in ms

    if (extendedFlag === 0x03) { // EXTENDED_BYTE_FLAG
        delay += extendedDelay * 200; // Add 200ms blocks
        i += 2; // Advance additional 2 bytes
    }

    const button = keyboardKeypadPage[keyCode] ?? (keyCode as MacroActionMouseCode);
    actions.push(new MacroAction({ direction, button, delay }));

    i += 2; // Advance base 2 bytes
}
```

## Button Assignment Integration

To trigger the configured macro when pressing a physical button, assign the macro to a slot in the Button Mapping protocol (Report ID `0x08`):

- **Firmware Action**: `0x12` (`FirmwareAction.CUSTOM_MACRO`)
- **Modifiers**: `0x00` (`Modifiers.None`)
- **Usage ID / Param**: Target `macroId` (e.g., `0x01`, `0x08`)

### Example:
```typescript
import { AttackSharkX11, FirmwareAction, Modifiers, SlotButton, MacroBuilder, MacroType, MacroAction, MacroActionDirection, keyboardKeypadPage } from 'attack-shark-x11';

// 1. Create and configure macro
const macro = new MacroBuilder({
    id: 0x08,
    name: 'Auto Attack',
    type: MacroType.FIXED_LOOP,
    loopTimes: 3,
    macroGunRGB: { r: 0xFF, g: 0x00, b: 0x00 },
    actions: [
        new MacroAction({
            direction: MacroActionDirection.Pressed,
            button: keyboardKeypadPage[0x04]!, // Key 'A'
            delay: 50,
        }),
        new MacroAction({
            direction: MacroActionDirection.Release,
            button: keyboardKeypadPage[0x04]!,
            delay: 50,
        }),
    ],
});

// 2. Send macro packets to device
await driver.setMacro(macro);

// 3. Assign macro to Button Slot 8 (Extra Button 5)
await driver.setButtonMapping({
    profileId: 0x01,
    slot8: new SlotButton(FirmwareAction.CUSTOM_MACRO, Modifiers.None, 0x08),
});
```

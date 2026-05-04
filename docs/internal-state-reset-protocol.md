# Internal State Reset Protocol (Report 0x0C)

This document details the **Internal State Reset** protocol used by the **Attack Shark X11**. This is a low-level command used to clear the active configuration structure stored in the device's volatile memory (RAM).

## Purpose and Mechanism

When the mouse receives this report, it performs a "soft reset" of its internal configuration state. This operation is designed to prepare the firmware for a full update of all settings (DPI, Polling Rate, Macros, etc.).

### Key Characteristics:
- **Volatile Only**: It only affects settings stored in RAM. It **does not** modify the EEPROM or permanent flash storage.
- **Preparatory Step**: It is intended to be the **first** packet in a configuration sequence.
- **State Clearing**: It clears active button mappings, lighting preferences, and sensor parameters from the immediate execution memory.

## Technical Specifications

The protocol uses a standard HID Feature Report (SET_REPORT).

| Parameter          | Value    | Description                             |
|--------------------|----------|-----------------------------------------|
| **Request Type**   | `0x21`   | Host-to-Device, Class, Interface        |
| **Request**        | `0x09`   | SET_REPORT                              |
| **Value (wValue)** | `0x030C` | Feature Report (0x03), Report ID (0x0C) |
| **Index (wIndex)** | `0x0002` | Interface Index 2                       |

## Data Packet Structure

The payload consists of a fixed "magic" signature. The length varies depending on the connection mode.

### Byte-by-Byte Analysis

| Byte Index | Field     | Value (Hex) | Description                          |
|------------|-----------|-------------|--------------------------------------|
| 0          | Report ID | `0x0C`      | Must match the low byte of `wValue`  |
| 1          | Magic 1   | `0x0A`      | Constant signature byte              |
| 2          | Magic 2   | `0x01`      | Constant signature byte              |
| 3          | Magic 3   | `0xFE`      | Constant signature byte              |
| 4          | Magic 4   | `0x01`      | Constant signature byte              |
| 5          | Magic 5   | `0xFE`      | Constant signature byte              |
| 6-9        | Padding   | `0x00`      | Only used in Wireless Mode (Adapter) |

### Mode Differences

1.  **Wired Mode**: The device expects exactly **6 bytes** (`0C 0A 01 FE 01 FE`).
2.  **Wireless/Adapter Mode**: The device expects **10 bytes**, where the last 4 bytes are null padding (`0C 0A 01 FE 01 FE 00 00 00 00`).

## Critical Warnings ⚠️

### 1. Partial Dysfunction Risk
Sending this command without a subsequent configuration update will leave the mouse in an undefined state. Since button mappings are cleared from RAM, the mouse may stop responding to clicks or movement until settings are reapplied or the device is power-cycled.

### 2. Implementation Order
This report **must** be followed by the reapplication of:
- DPI Stages and Active Stage
- Polling Rate
- Button Mappings
- Macros
- User Preferences (Lighting, Key Response, etc.)

## Implementation Workflow

The following sequence reflects the logic used in the `AttackSharkX11.reset()` method:

```typescript
// 1. Initialize Reset
await driver.sendInternalStateResetReport(); // Sends the 0x0C report

// 2. Re-apply Factory Defaults or User Config
await driver.resetDpi();            // Sends DPI configuration
await driver.resetUserPreferences(); // Sends LED and Key Response settings
await driver.resetPollingRate();     // Sends Polling Rate configuration
await driver.resetMacro();           // Clears/Resets standard buttons
await driver.resetCustomMacro();     // Clears/Resets advanced macros
```

## Summary
- **Report ID**: 0x0C
- **Interface**: 2
- **Wired Payload**: 6 bytes
- **Wireless Payload**: 10 bytes
- **Primary Use**: Cleaning RAM before full configuration sync.

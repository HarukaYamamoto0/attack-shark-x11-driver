Attack Shark X11 – Internal State Reset Protocol (Report 0x030C)

This document describes the USB HID report used by the class InternalStateResetReportBuilder to reset the active configuration stored in the mouse RAM.

Important: This is an internal, high-risk operation that should never be exposed as a public API. It is intended to clear the in-memory configuration structure before reapplying all configuration blocks during a full profile update.

HID Report Parameters

- Request Type (bmRequestType): 0x21 (Host-to-Device, Class, Interface)
- Request (bRequest): 0x09 (SET_REPORT)
- Value (wValue): 0x030C (Feature report, Report ID = 0x0C)
- Index (wIndex): 0x0002 (Interface index)

Reference: src/protocols/InternalStateResetReportBuilder.ts

Behavior Summary

What it does:
- Clears the current configuration structure in volatile memory (RAM).
- Temporarily disables button mapping and may leave the device partially non-functional until all settings are resent.

What it does NOT do:
- Does not erase EEPROM or other persistent storage.
- Does not restore factory defaults.
- Does not finalize or commit any configuration by itself.

If you send this report without immediately sending the full configuration sequence, the mouse may stop responding correctly (for example, buttons may stop working) until it is power-cycled.

Payload Layout

Two payload lengths have been observed, depending on the connection mode.

Wired Mode (6 bytes)

Index 0: Report ID = 0x0C
Index 1: Magic 1 = 0x0A (observed constant)
Index 2: Magic 2 = 0x01 (observed constant)
Index 3: Magic 3 = 0xFE (observed constant)
Index 4: Magic 4 = 0x01 (observed constant)
Index 5: Magic 5 = 0xFE (observed constant)

Hex example (wired):
0C 0A 01 FE 01 FE

Wireless or Adapter Mode (10 bytes)

Index 0: Report ID = 0x0C
Index 1: Magic 1 = 0x0A (observed constant)
Index 2: Magic 2 = 0x01 (observed constant)
Index 3: Magic 3 = 0xFE (observed constant)
Index 4: Magic 4 = 0x01 (observed constant)
Index 5: Magic 5 = 0xFE (observed constant)
Index 6: Reserved = 0x00 (padding)
Index 7: Reserved = 0x00 (padding)
Index 8: Reserved = 0x00 (padding)
Index 9: Reserved = 0x00 (padding)

Hex example (wireless):
0C 0A 01 FE 01 FE 00 00 00 00

Notes:
- The exact semantic meaning of these constants is unknown; behavior is empirically confirmed as a RAM config reset.
- There is no per-report checksum for this message.

Checksum

No checksum is used for this report. The builder calculateChecksum() returns 0x00 and no checksum bytes are appended.

Build Logic and Mode Differences

- build(ConnectionMode.Wired) returns the first 6 bytes.
- build(ConnectionMode.Wireless) returns all 10 bytes with trailing zeros as padding.

Safe Usage Guidelines

- Never send this report on its own.
- Never send it twice in a row.
- Only send it as the first step in a complete configuration update and immediately follow with all configuration blocks (DPI, user preferences, button mappings or macros, lighting, etc.).
- If a complete sequence is not sent, the device may require a physical power cycle to recover.

Example Sequence (pseudocode)

// 1) Reset in-RAM state
send InternalStateResetReportBuilder.build(mode)

// 2) Reapply all settings
send DpiBuilder.build(mode)
send UserPreferencesBuilder.build(mode)
// ... send button mappings, macros, lighting, etc.

Troubleshooting

- After sending the reset, if the mouse stops responding or buttons do not work, ensure you have sent all later configuration reports in the correct order. If still unresponsive, perform a power cycle (unplug and replug or toggle power) to restore normal behavior.
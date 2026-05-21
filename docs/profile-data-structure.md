# Software Profile Data Structure (.data files) (it still needs more studies)

The Attack Shark software stores user configurations and default profiles in `.data` files located in the `Data\ms_X\` subdirectories.

## Profile Files
- `pro.data`: Contains performance settings, button mappings, and lighting configurations.
- `macro.data`: Contains recorded macro sequences.

## Structure of `pro.data` (MS_4 / X11)

The `pro.data` file is a binary file approximately 290KB in size. It appears to store multiple profiles (slots) sequentially.

### Profile Slots
Profiles are identified by the UTF-16LE string `Profile` followed by the index (e.g., `Profile1`, `Profile2`).

- **Offset `0x28460`**: Start of Profile names section.
- **Data per Profile**: Each profile contains approximately 2048 bytes of configuration data.

### Data Mapping to HID Packets
When a profile is "Applied" in the software, the relevant bytes are extracted from the `.data` file and mapped into the 56-byte HID buffer (Report 0x0304) or the Lighting Report.

| Feature     | `pro.data` Value            | HID Buffer Offset |
|:------------|:----------------------------|:------------------|
| DPI Stages  | Variable (Mapped via Table) | 8 - 13            |
| Angle Snap  | `0x00` / `0x01`             | 3                 |
| Motion Sync | `0x00` / `0x01`             | 25                |
| LOD         | `0x01` / `0x02`             | 44                |
| Debounce    | `0x01` - `0x14`             | 46                |

## Observation on Checksum
The software calculates the checksum *at the time of transmission* based on the active buffer, it is not stored pre-calculated in the `.data` file for the entire packet.

## Macro Data
The `macro.data` file uses a similar binary format where each macro has a fixed-size header followed by the sequence of key events (Scan Codes) and delays (in milliseconds).

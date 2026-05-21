# Attack Shark X11 - DPI Stage Mask Analysis

Observations on how the Attack Shark X11 mouse handles DPI stages, specifically the mask bytes and high stage flags.

## DPI Thresholds and Byte Activation

It has been observed that certain bytes are activated based on the DPI value of each stage.

### High Stage Flags (Bytes 16–21)
These bytes (one for each stage) are set to `0x01` when the DPI falls within the following ranges:
- **Range A:** `10,100` <= DPI <= `12,000`
- **Range B:** `20,100` <= DPI <= `22,000`

*Note: For values between `12,100` and `20,000`, these bytes are `0x00`.*

### Stage Masks (Bytes 6-7)
The stage mask bytes are bitmasks (Bit 0 for Stage 1, Bit 1 for Stage 2, etc.) that are activated when:
- DPI > `12,000`

## Sample Payloads for Stage 1

Below are hex representations of the 56-byte payload (Wired mode uses the first 52 bytes).

| DPI   | Payload (Partial/Key Bytes)                  | Observations                                     |
|-------|----------------------------------------------|--------------------------------------------------|
| 50    | `...2020 01 25384b7581 0000 000000000000...` | Normal                                           |
| 10000 | `...2020 eb 25384b7581 0000 000000000000...` | Threshold (High Flag NOT active yet)             |
| 10100 | `...2020 76 25384b7581 0000 010000000001...` | **High Flag Active** (Byte 16 = 0x01)            |
| 12000 | `...2020 8d 25384b7581 0000 010000000001...` | **High Flag Active** (Byte 16 = 0x01)            |
| 12100 | `...2121 8e 25384b7581 0000 000000000000...` | **Mask Active** (Byte 6/7 = 0x21), High Flag OFF |
| 20000 | `...2121 eb 25384b7581 0000 000000000000...` | Mask Active, High Flag OFF                       |
| 20100 | `...2121 eb 25384b7581 0000 010000000001...` | **Mask Active** AND **High Flag Active**         |
| 22000 | `...2121 81 25384b7581 0000 010000000001...` | Mask Active AND High Flag Active                 |

*Note: In the samples above, stage 6 is at its default 22,000 DPI, which is why the last byte of the high flags (index 21) is also `0x01` and the mask bit for stage 6 (`0x20`) is set in later examples.*

## Stage Specific Samples (DPI 10,100)

| Stage | Payload Segment (High Stage Flags at 16-21) | Key Byte Index |
|-------|---------------------------------------------|----------------|
| 1     | `0000 01 00000000 01`                       | 16             |
| 2     | `0000 00 01000000 01`                       | 17             |
| 3     | `0000 00 00010000 01`                       | 18             |
| 4     | `0000 00 00000100 01`                       | 19             |
| 5     | `0000 00 00000001 01`                       | 20             |
| 6     | `0000 00 00000000 01`                       | 21             |

*(Stage 6 always has 0x01 in these samples because its value is 22,000)*



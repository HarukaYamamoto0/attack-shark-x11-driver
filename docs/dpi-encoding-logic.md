# DPI Logic and Encoding

This document explains the mathematical logic and encoding scheme used by the Attack Shark X11 (MS_4) to handle DPI values ranging from 50 to 26,000.

## 1. Internal Storage (Software Level)

In the official Windows software (`pro.data`), DPI values are stored as simple 32-bit integers using the formula:
**`StoredValue = DPI / 50`**

*Example:*
- 800 DPI -> `16` (`0x10 0x00 0x00 0x00`)
- 16000 DPI -> `320` (`0x40 0x01 0x00 0x00`)

## 2. HID Protocol Encoding (Hardware Level)

The mouse hardware receives DPI settings via **Report 0x0304**. Since each DPI stage is represented by a single byte (8 bits), the value cannot exceed 255. To support up to 26,000 DPI (which would be 520), the protocol uses a combination of a base value and two sets of flags.

### Base Value (Bytes 8–13)
For each of the 6 stages, the base byte follows a "wrapping" logic based on specific thresholds:

| DPI Range       | Hex Calculation (Approx) | Note                         |
|:----------------|:-------------------------|:-----------------------------|
| 50 - 10,000     | `DPI / 50`               | Values `0x01` to `0xEB`      |
| 10,100 - 20,000 | `(DPI - 4200) / 50`      | Values reset and wrap around |
| 20,100 - 26,000 | `(DPI - 16400) / 50`     | Values wrap again            |

### Flag A: Expanded Mask (Bytes 16–21)
This mask is used for values in the medium-high range.
- **Set to `0x01`** if DPI is between **10,100 and 12,000** OR between **20,100 and 22,000**.
- **Otherwise `0x00`**.

### Flag B: Stage Mask (Bytes 6 and 7)
This is a bitmask (1 bit per stage) used for very high values.
- **Bit set** if DPI > **12,000**.
- Stage 1: `0x01`, Stage 2: `0x02`, Stage 3: `0x04`, etc.

## 3. Why a LUT (dpi-map.ts) is preferred over a Formula

While the `/ 50` logic is the foundation, the actual table used by the manufacturer (`DPI_STEP_MAP`) contains several non-linear adjustments (jumps of 2 instead of 1 in the hex values).

**Examples of non-linearity:**
- 300 DPI -> `0x06`
- 350 DPI -> `0x08` (Jumped `0x07`)
- 550 DPI -> `0x0c`
- 600 DPI -> `0x0e` (Jumped `0x0d`)

These jumps likely correspond to specific internal sensor registers or calibrations for the PixArt sensor.

### Recommendation
Continue using the **LUT (Look-Up Table)** provided in `src/tables/dpi-map.ts`. It accurately captures these hardware-specific quirks that a simple `DPI / 50` formula would miss, ensuring the mouse sensor behaves exactly as it does with the official software.

## 4. Summary Table for Implementation

| Feature             | Range             | Implementation           |
|:--------------------|:------------------|:-------------------------|
| **DPI Value**       | 50-26000          | Use `DPI_STEP_MAP[dpi]`  |
| **High Range Flag** | > 12000           | Set bits in Byte 6 & 7   |
| **Transition Flag** | 10k-12k / 20k-22k | Set Byte 16-21 to `0x01` |

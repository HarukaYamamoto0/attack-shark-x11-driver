# User Preferences Protocol

> [!TIP]
> To better understand this document, read the `README.md` located in the root of this directory first.

> [!NOTE]
> During reverse engineering, the original name of this protocol was identified as **Lighting Settings**. However, since
the protocol controls several settings unrelated to lighting, **User Preferences** was chosen as a more accurate and
descriptive name.

<!-- TODO: Rename LightingSettingsBuilder class to UserPreferencesBuilder -->

The **User Preferences Protocol** allows software to configure various device settings, including lighting effects, RGB
colors, LED brightness, sleep timers, key response time, and other user preferences.

Some compatible mouse models do not support every feature exposed by this protocol. For example, the Attack Shark R1
does not have an LED, while the Attack Shark X11 does not support configurable Lift-Off Distance (LOD).

The protocol remains applicable to these devices. Unsupported settings can generally be left unchanged or assigned valid
default values, provided the resulting payload remains compatible with the device.

## Structure

The report consists of **13 bytes in Wired mode** or **15 bytes in Wireless (Adapter) mode**, including the Report ID.

Both variants share the same configuration fields. The wireless variant includes two additional padding bytes.

| Offset | Example | Description                 |
|--------|---------|-----------------------------|
| 0      | `0x05`  | Report ID                   |
| 1      | `0x0F`  | Report Length               |
| 2      | `0x01`  | Profile ID                  |
| 3      | `0x00`  | Lighting Mode               |
| 4      | `0x03`  | Deep Sleep High / LED Speed |
| 5      | `0xA8`  | Deep Sleep Low / Brightness |
| 6      | `0x00`  | Red                         |
| 7      | `0xFF`  | Green                       |
| 8      | `0x00`  | Blue                        |
| 9      | `0x01`  | Sleep Timer                 |
| 10     | `0x04`  | Key Response Time           |
| 11     | `0x01`  | Checksum High               |
| 12     | `0xAF`  | Checksum Low                |
| 13     | `0x00`  | Padding (Wireless)          |
| 14     | `0x00`  | Padding (Wireless)          |

> [!NOTE]
> The example uses `0x0F` as the Report Length field. Whether this value must change to `0x0D` for the 13-byte wired
variant has not yet been verified.

## Offset 3 – Lighting Mode

This byte uses **bit packing**, with the lighting mode stored in the upper nibble (bits `7–4`). The lower nibble
(bits `3–0`) is currently unused.

To encode a lighting mode, shift its value left by four bits:

```text
Encoded Value = (Lighting Mode & 0x0F) << 4
```

| Value  | Mode               | Effect                                                 |
|--------|--------------------|--------------------------------------------------------|
| `0x00` | Off                | Disables LED lighting.                                 |
| `0x01` | Static             | Displays a fixed color.                                |
| `0x02` | Breathing          | Pulses a single color.                                 |
| `0x03` | Neon               | Cycles through rainbow colors.                         |
| `0x04` | Color Breathing    | Pulses while cycling through different colors.         |
| `0x05` | Static DPI         | Displays a fixed color based on the active DPI stage.  |
| `0x06` | Breathing DPI      | Pulses the color associated with the active DPI stage. |
| `0x07` | Rainbow Wave       | Effect not yet determined.                             |
| `0x08` | Lightning          | Effect not yet determined.                             |
| `0x09` | Static Mixed Color | Effect not yet determined.                             |
| `0x0A` | Marquee            | Effect not yet determined.                             |
| `0x0B` | Marquee 2          | Effect not yet determined.                             |

For example, selecting **Static** (`0x01`) produces the encoded value `0x10`.

## Offsets 4–5 – Deep Sleep, LED Speed, and Brightness

These two bytes contain three independent settings using nibble packing.

```text
Offset 4                       Offset 5
┌────────────┬───────────┐    ┌────────────┬────────────┐
│ Bits 7–4   │ Bits 3–0  │    │ Bits 7–4   │ Bits 3–0   │
├────────────┼───────────┤    ├────────────┼────────────┤
│ Deep Sleep │ LED Speed │    │ Deep Sleep │ Brightness │
│ High       │           │    │ Low        │            │
└────────────┴───────────┘    └────────────┴────────────┘
```

### Deep Sleep Timer

The Deep Sleep Timer determines how many minutes of inactivity must pass before the mouse enters Deep Sleep mode.

The supported range is **1 to 60 minutes**.

The timer is encoded as an 8-bit value distributed across the upper nibbles of offsets `4` and `5`:

- **Offset 4, high nibble:** Bits `7–4` of the timer.
- **Offset 5, high nibble:** Bits `3–0` of the timer.

To reconstruct the timer:

```text
Deep Sleep = (Byte[4] & 0xF0) | ((Byte[5] >> 4) & 0x0F)
```

To encode a new timer value while preserving the LED Speed and Brightness settings:

```text
Byte[4] = (Deep Sleep & 0xF0) | (Byte[4] & 0x0F)
Byte[5] = ((Deep Sleep & 0x0F) << 4) | (Byte[5] & 0x0F)
```

For example, a Deep Sleep Timer of 30 minutes (`0x1E`), with LED Speed set to Normal (`0x03`) and Brightness set to Very
Bright (`0x08`), produces:

```text
Offset 4: 0x13
Offset 5: 0xE8
```

**Important:** The lower nibbles must be preserved when updating the Deep Sleep Timer. Otherwise, the LED Speed and
Brightness settings will be overwritten.

### LED Speed

The lower nibble of offset `4` controls the speed of supported lighting effects.

| Value  | Speed     |
|--------|-----------|
| `0x01` | Very Slow |
| `0x02` | Slow      |
| `0x03` | Normal    |
| `0x04` | Fast      |
| `0x05` | Very Fast |

Valid values range from `1` to `5`.

### Brightness Level

The lower nibble of offset `5` controls the intensity of the LED lighting.

| Value  | Brightness  |
|--------|-------------|
| `0x01` | Very Dim    |
| `0x02` | Dim         |
| `0x03` | Low         |
| `0x04` | Medium-Low  |
| `0x05` | Medium      |
| `0x06` | Medium-High |
| `0x07` | Bright      |
| `0x08` | Very Bright |

Valid values range from `1` to `8`.

## Offsets 6–8 – LED Color

These three bytes define the LED color using the standard **RGB color model**.

Each component is represented by an unsigned 8-bit value ranging from `0` to `255`.

| Offset | Example | Component |
|--------|---------|-----------|
| 6      | `0x00`  | Red       |
| 7      | `0xFF`  | Green     |
| 8      | `0x00`  | Blue      |

For example, the sequence `00 FF 00` represents green (`#00FF00`).

The actual displayed color may depend on the selected lighting mode. Some effects use predefined colors or cycle through
multiple colors automatically.

## Offset 9 – Sleep Timer

This byte determines the inactivity duration before the mouse enters its regular Sleep mode.

The supported range is **0.5 to 30 minutes**, in increments of **0.5 minutes**.

The protocol uses an index-based encoding corresponding to entries in a lookup table (LUT), rather than storing the
duration directly.

| Duration    | Encoded Value |
|-------------|---------------|
| 0.5 minutes | `0x01`        |
| 1 minute    | `0x02`        |
| 1.5 minutes | `0x03`        |
| 2 minutes   | `0x04`        |
| 2.5 minutes | `0x05`        |
| 5 minutes   | `0x0A`        |
| 10 minutes  | `0x14`        |
| 15 minutes  | `0x1E`        |
| 20 minutes  | `0x28`        |
| 25 minutes  | `0x32`        |
| 30 minutes  | `0x3C`        |

Since the observed mapping follows a linear progression, the index can be calculated directly:

```text
Encoded Value  = Duration (minutes) × 2
Duration (min) = Encoded Value / 2
```

For example, `0x14` (20 decimal) corresponds to 10 minutes.

## Offset 10 – Key Response Time

This byte configures the **Key Response Time**, control the delay associated with mouse button input processing.

The documented range is **4 ms to 50 ms**, in increments of **2 ms**.

| Response Time | Encoded Value |
|---------------|---------------|
| 4 ms          | `0x02`        |
| 6 ms          | `0x03`        |
| 8 ms          | `0x04`        |
| 10 ms         | `0x05`        |
| 12 ms         | `0x06`        |
| 20 ms         | `0x0A`        |
| 30 ms         | `0x0F`        |
| 40 ms         | `0x14`        |
| 50 ms         | `0x19`        |

The encoding uses half of the desired response time:

```text
Encoded Value     = Response Time (ms) / 2
Response Time (ms) = Encoded Value × 2
```

> [!NOTE]
> Some mouse models appear to support a response time of 0 ms. However, no verified samples are currently available to
confirm this behavior or its exact encoding.
>
> Based on the documented calculation, `0x00` would represent 0 ms, while `0x01` would represent 2 ms. Neither value
should be assumed to be supported without device-specific verification.

## Offsets 11–12 – Checksum

These bytes contain a **16-bit additive checksum**, calculated by summing the configuration bytes from offsets `3`
through `10`, inclusive.

The result is stored in big-endian byte order:

- **Offset 11:** Most significant byte (Checksum High).
- **Offset 12:** Least significant byte (Checksum Low).

The calculation is:

```text
Checksum = Sum(Byte[3] ... Byte[10]) & 0xFFFF

Byte[11] = (Checksum >> 8) & 0xFF
Byte[12] = Checksum & 0xFF
```

For example, given the following configuration bytes:

```hex
00 03 A8 00 FF 00 01 04
```

Their sum is:

```text
0x00 + 0x03 + 0xA8 + 0x00 +
0xFF + 0x00 + 0x01 + 0x04 = 0x01AF
```

Therefore, the checksum bytes are:

```hex
01 AF
```

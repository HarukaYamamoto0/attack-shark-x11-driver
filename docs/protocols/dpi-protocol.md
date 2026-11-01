# DPI Protocol

> [!TIP]
> To better understand this document, read the `README.md` located in the root of this directory first.

> [!NOTE]
> I also have access to DPI protocols for other sensors, such as the PAW3395, PAW3950/3955, and PAW3220, as well as mice
like the Attack Shark G9 Pro and V2 Ultra 3955, which allow DPI values to be set directly. However, since documenting
all of these protocols would make this documentation considerably longer, I decided to focus exclusively on the Attack
Shark X11.
>
> If you're interested in learning more about these protocols, feel free to open an issue or email me, and I'll be happy
to share my findings.

The **DPI Protocol** allows configuring optical sensor parameters, DPI sensitivity stages, and per-stage LED indicator
colors for the Attack Shark X11 and compatible mice.

Through this protocol, the host software can:

- Configure sensor behaviors such as **Angle Snapping**, **Ripple Control**, **Motion Sync**, and **Lift-Off Distance**.
- Enable or disable individual DPI stages (up to 8 stages supported in the protocol structure).
- Set independent sensitivity values for each DPI stage (from 50 DPI up to 26,000 DPI).
- Assign custom **RGB colors** for each DPI stage indicator.
- Switch to the currently active DPI stage.

Some compatible mouse models do not support every hardware feature exposed by this protocol. For instance, while the
protocol format includes fields for **Lift-Off Distance (LOD)** and **Motion Sync**, the PixArt PAW3311 optical sensor
used in the Attack Shark X11 does not support configurable LOD or Motion Sync at the hardware/firmware level.
Unsupported settings should be kept at their default values to maintain device compatibility.

## Structure

The configuration report consists of **51–52 bytes in Wired mode** or **56 bytes in Wireless (Adapter) mode**, including
the Report ID.

| Offset   | Default    | Description                        |
|----------|------------|------------------------------------|
| 0        | `0x04`     | Report ID                          |
| 1        | `0x38`     | Report Length                      |
| 2        | `0x01`     | Profile ID                         |
| 3        | `0x00`     | Lift-Off Distance and Angle Snap   |
| 4        | `0x01`     | Motion Sync and Ripple Control     |
| 5        | `0x3F`     | Active Stages Bitmask              |
| 6        | `0x20`     | DPI Double Multiplier Bitmask      |
| 7        | `0x20`     | DPI Triple Multiplier Bitmask      |
| 8        | `0x12`     | Stage 1 DPI (Base / X Byte)        |
| 9        | `0x25`     | Stage 2 DPI (Base / X Byte)        |
| 10       | `0x38`     | Stage 3 DPI (Base / X Byte)        |
| 11       | `0x4B`     | Stage 4 DPI (Base / X Byte)        |
| 12       | `0x75`     | Stage 5 DPI (Base / X Byte)        |
| 13       | `0x81`     | Stage 6 DPI (Base / X Byte)        |
| 14       | `0x00`     | Stage 7 DPI (Base / X Byte)        |
| 15       | `0x00`     | Stage 8 DPI (Base / X Byte)        |
| 16       | `0x00`     | Stage 1 DPI High / Mode (Y Byte)   |
| 17       | `0x00`     | Stage 2 DPI High / Mode (Y Byte)   |
| 18       | `0x00`     | Stage 3 DPI High / Mode (Y Byte)   |
| 19       | `0x00`     | Stage 4 DPI High / Mode (Y Byte)   |
| 20       | `0x00`     | Stage 5 DPI High / Mode (Y Byte)   |
| 21       | `0x01`     | Stage 6 DPI High / Mode (Y Byte)   |
| 22       | `0x00`     | Stage 7 DPI High / Mode (Y Byte)   |
| 23       | `0x00`     | Stage 8 DPI High / Mode (Y Byte)   |
| 24       | `0x02`     | Active Stage Index (`0x01`–`0x08`) |
| 25,26,27 | `FF,00,00` | Stage 1 RGB                        |
| 28,29,30 | `00,FF,00` | Stage 2 RGB                        |
| 31,32,33 | `00,00,FF` | Stage 3 RGB                        |
| 34,35,36 | `FF,FF,00` | Stage 4 RGB                        |
| 37,38,39 | `00,FF,FF` | Stage 5 RGB                        |
| 40,41,42 | `FF,00,FF` | Stage 6 RGB                        |
| 43,44,45 | `FF,40,00` | Stage 7 RGB                        |
| 46,47,48 | `FF,FF,FF` | Stage 8 RGB                        |
| 49       | `0x02`     | DPI Active Indicator Mode          |
| 50       | `0x0F`     | Checksum High                      |
| 51       | `0x68`     | Checksum Low                       |
| 52       | `0x00`     | Padding (Wireless)                 |
| 53       | `0x00`     | Padding (Wireless)                 |
| 54       | `0x00`     | Padding (Wireless)                 |
| 55       | `0x00`     | Padding (Wireless)                 |

### Offset 3 - Lift-Off Distance and Angle Snap

This byte uses **nibble packing**: the high nibble encodes the **Lift-Off Distance (LOD)** setting, while the low
nibble encodes the **Angle Snapping** setting.

#### High-nibble - Lift-Off Distance (LOD)

The Attack Shark X11 apparently does not natively support configurable LOD. Nevertheless, the protocol format must
still be followed to prevent the firmware from rejecting the command.

| Value  | Description       |
|--------|-------------------|
| `0x00` | 1mm               |
| `0x01` | 2mm               |
| `0x02` | 0.7mm             |
| `0x08` | M740 special mode |

The value `0x08` has only been observed on a device with Device ID `0x87`. Since I do not have enough information
about this model to test its behavior, I do not recommend using this value.

#### Low-nibble - Angle Snap

**Angle Snap (Angle Snapping or Path Prediction)** is a feature that automatically adjusts mouse movements to produce
smoother and
straighter lines. It works by predicting the intended direction of movement and correcting small deviations, making it
easier to draw straight lines. However, it may reduce precision by altering the user's natural mouse movements.

| Value  | Description |
|--------|-------------|
| `0x00` | Disabled    |
| `0x01` | Active      |

### Offset 4 – Motion Sync and Ripple Control

#### High-nibble - Motion Sync

**Motion Sync** synchronizes the timing of motion data reported by the optical sensor with the mouse's USB polling
intervals. This can improve the consistency of motion reports by reducing variations in when sensor measurements are
reported. Depending on the implementation, this synchronization may introduce a small amount of additional latency.
Motion Sync does not synchronize the mouse with the monitor's refresh rate or modify mouse acceleration.

| Value  | Description |
|--------|-------------|
| `0x00` | Disabled    |
| `0x01` | Active      |

#### Low-nibble - Ripple Control

**Ripple Control** is a motion-smoothing feature designed to reduce sensor noise and cursor jitter, particularly at
high DPI (CPI) settings. It filters small fluctuations in the sensor's motion data to produce more stable tracking.
However, smoothing can introduce additional motion latency and reduce the fidelity of small movements. It does not
depend on the monitor's refresh rate or adjust mouse acceleration.

| Value  | Description |
|--------|-------------|
| `0x00` | Disabled    |
| `0x01` | Active      |

### Offset 5 – Active Stages Bitmask

This byte determines which of the 8 possible DPI stages are enabled. Each bit corresponds to one stage:

| Bit | Stage   | State          |
|-----|---------|----------------|
| 0   | Stage 1 | `1` (Active)   |
| 1   | Stage 2 | `1` (Active)   |
| 2   | Stage 3 | `1` (Active)   |
| 3   | Stage 4 | `1` (Active)   |
| 4   | Stage 5 | `1` (Active)   |
| 5   | Stage 6 | `1` (Active)   |
| 6   | Stage 7 | `0` (Disabled) |
| 7   | Stage 8 | `0` (Disabled) |

The default value `0x3F` which in binary is `0b00111111` enables Stages 1 through 6 and disables Stages 7 and 8.

### Offsets 6...7 – doubleFlags and tripleFlags

These two bytes use the same bitmask mechanism as the preceding byte, but here the flags indicate specific DPI value
ranges to the firmware.

Offset 6, also referred to as `doubleFlags`, is used for DPI values in the **12,000–24,000 DPI** range. Offset 7,
referred to as `tripleFlags`, is used for DPI values in the **24,100–25,000 DPI** range.

These DPI ranges may vary depending on the mouse model. If you are unsure which ranges apply to your device, feel
free to open an issue or contact me by email, and I can try to help identify the appropriate ranges.

### Offset 8-23 - DPI Values and Multipliers

I strongly recommend consulting the source code for a more detailed understanding of the encoding mechanism. The
encoding is somewhat complex, and covering every detail here would be impractical. In this case, the implementation
itself may serve as the most useful reference.

Note that this encoding scheme primarily applies to the Attack Shark X11 and may differ slightly on other models.
If you have questions about the encoding used by your mouse, feel free to open an issue or contact me by email, and
I can try to help determine how it works.

## Offset 24 – Active Stage Index

This byte indicates which DPI stage is currently active.

| Value  | Stage   |
|--------|---------|
| `0x01` | Stage 1 |
| `0x02` | Stage 2 |
| `0x03` | Stage 3 |
| `0x04` | Stage 4 |
| `0x05` | Stage 5 |
| `0x06` | Stage 6 |
| `0x07` | Stage 7 |
| `0x08` | Stage 8 |

## Offsets 25–48 – DPI Stage RGB Colors

These 24 bytes define the RGB indicator colors for all 8 DPI stages. Each stage uses 3 consecutive bytes (Red, Green,
Blue), with intensity values ranging from `0` to `255` (`0x00` to `0xFF`).

| Stage   | Red Offset | Green Offset | Blue Offset | Default Hex Color | Default Color Name |
|---------|------------|--------------|-------------|-------------------|--------------------|
| Stage 1 | `0xFF`     | `0x00`       | `0x00`      | `#FF0000`         | Red                |
| Stage 2 | `0x00`     | `0xFF`       | `0x00`      | `#00FF00`         | Green              |
| Stage 3 | `0x00`     | `0x00`       | `0xFF`      | `#0000FF`         | Blue               |
| Stage 4 | `0xFF`     | `0xFF`       | `0x00`      | `#FFFF00`         | Yellow             |
| Stage 5 | `0x00`     | `0xFF`       | `0xFF`      | `#00FFFF`         | Cyan               |
| Stage 6 | `0xFF`     | `0x00`       | `0xFF`      | `#FF00FF`         | Magenta            |
| Stage 7 | `0xFF`     | `0x40`       | `0x00`      | `#FF4000`         | Orange             |
| Stage 8 | `0xFF`     | `0xFF`       | `0xFF`      | `#FFFFFF`         | White              |

When a DPI stage is selected, the mouse LED indicator illuminates in the configured color.

## Offset 49 – DPI Indicator Mode

This byte specifies the lighting animation mode for the DPI indicator when switching stages.

| Value  | Mode     |
|--------|----------|
| `0x01` | Blinking |
| `0x02` | Static   |
| `0x03` | Disabled |

The lighting behavior associated with each mode may differ slightly between mouse models. This is particularly true
for `0x03`, whose behavior has not been definitively established. Inspecting the firmware would be the most reliable
way to determine what this mode actually does.

These lighting modes are applied temporarily to the mouse's LED indicator. For example, if the default lighting mode
is set to `Neon` and the user switches DPI stages, the LED temporarily uses the mode configured by **DPI Indicator
Mode**. This temporary indication typically lasts approximately **2–3 seconds**, after which the LED returns to its
default lighting mode (`Neon` in this example).

## Offsets 50–51 – Checksum

The checksum is a **16-bit additive sum** of all payload configuration bytes from offset `3` through `49`, inclusive.

The result is stored in big-endian byte order:

- **Offset 50:** Most significant byte (Checksum High).
- **Offset 51:** Least significant byte (Checksum Low).

## Related Messages

When the physical DPI cycle button is pressed on the mouse (or triggered by a macro), the mouse emits an asynchronous
notification on the Events interface:

- **[DPI Cycle Event (`0x10`)](../messages/dpi-cycle.md):** Emitted whenever the active DPI stage is changed via
  hardware buttons.

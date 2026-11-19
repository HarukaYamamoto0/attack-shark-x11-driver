# Battery Status

> [!TIP]
> To better understand this document, read the `README.md` located in the root of this directory first.

Although this event is primarily used to report battery status, reverse engineering revealed that its original name is
**Device Connection Message**, as it is primarily used by the official panel to detect the Device ID of the connected
device.

## Structure

| Event Code  | Param 1 | Param 2 |
|-------------|---------|---------|
| `0x40-0x41` | `0x01`  | `0x64`  |

### Event Code

During reverse engineering, I observed that this event may use either `0x40` or `0x41`. Both values appear to represent
the same event. However, I do not currently have any captured samples using `0x41`, so it is unknown whether there are
any behavioral differences between them.

### Param 1

Indicates the battery or charging state. Three values have been observed:

| Value  | Description          |
|--------|----------------------|
| `0x01` | Charging complete    |
| `0x02` | Fully charged        |
| `0x03` | Charging in progress |

A value of `0x03` also indicates that the device is operating in **Wired** mode, since the battery is continuously
charged while the mouse is connected via USB.

While the device is in state `0x03`, the `Param 2` field retains the most recently processed battery percentage value.
Unfortunately, it does not provide any sign of the actual charging current or charging progress.

### Param 2

Represents the battery percentage. For example, `0x64` corresponds to `100` in decimal, representing a fully charged
battery.

## Example

```text
03 55 40 01 45
│  │  │  │  └── Percentage: 69%
│  │  │  └───── Charging Status: complete
│  │  └──────── Event Code: 0x40
│  └─────────── Device ID
└────────────── Report ID
```

## Observed Behaviors

1. The Attack Shark X11 may send a battery report with `Param 2 = 0x64` (100%) immediately after communication with the
   device is established, even when the actual battery level is lower. A subsequent report usually contains the correct
   value.

2. Battery percentage measurements are somewhat imprecise. The reported percentage may be slightly higher or lower
   than the actual battery level.

3. When the device is charging and the charging process completes, it sends the following report exactly once; in other
   words, if you miss this information, it is gone for good, and later messages will continue to indicate that it
   is still charging.

   ```text
   03 55 40 02 64
   ```

   This indicates that the battery is fully charged (`Param 1 = 0x02`) and reports a battery level of 100%
   (`Param 2 = 0x64`).

## Other Models

### X6 (`0x10`)

> The following information is based
> on [this GitHub issue](https://github.com/Abosmra/rust-shark/issues/1#issuecomment-6808446226).

The overall packet structure remains the same.

- The X6 reports a device ID of `0x10`, which is the same device ID used by the Attack Shark R1.
- Battery status updates are received approximately every 2 seconds. The battery level is reported on a scale of 1–10
  rather than as a percentage, with hexadecimal values ranging from `0x01` to `0x0A`.

### X11 PRO V2 (`0xA9`)

- `params2` continues to update while the device is charging. However, the reported battery percentage is inaccurate,
  reaching 100% well before the `0x02` status report is received.
- When the device is on the charging dock and the battery reaches 100%, `params1` alternates between `0x01` and `0x03`
  as charging stops and restarts.

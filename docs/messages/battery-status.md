# Battery Status

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

# Device Connection Message

> To better understand this document, read the `README.md` located in the root of this directory first.

Although this event is primarily used to report the battery status, reverse engineering revealed that its original name
is **Device Connection Message**. The reason for this name is outside the scope of this documentation, so the original
name has been preserved.

## Structure

| event code | params1 | params2 |
|------------|---------|---------|
| 0x40-0x41  | 0x01    | 0x64    |

### event code

During reverse engineering, I observed that this event may use either `0x40` or `0x41`. Both values appear to represent
the same event. However, I do not have any samples using `0x41`, so it is currently unknown whether there are any
behavioral differences between them.

### params1

Indicates the battery state. Three values have been observed:

| Value | Description          |
|-------|----------------------|
| 1     | Charging complete    |
| 2     | Fully charged        |
| 3     | Charging in progress |

It is worth noting that a value of `0x03` also indicates that the device is operating in **Wired** mode, since the
battery is continuously charged while connected via USB.

and, when operating in mode `0x03`, the `params2` field retains the processed value from the last battery percentage reading;
unfortunately, it does not display the charging request.

### params2

Represents the battery percentage as an unsigned 8-bit integer. `0x64` corresponds to `100` in decimal, representing a
fully charged battery.

> **Observed behavior**
>
> On the Attack Shark X11, immediately after establishing communication with the device, the first battery report may
> temporarily return `0x64` (100%), even when the actual battery level is lower. A subsequent report usually contains
> the correct value.
>
> The exact reason is unknown. One possible explanation is that the firmware initializes the battery level to `100`
> before the ADC performs the first voltage measurement.

## Example

```text
03 55 40 03 45

03    Event Message opcode
55    Device ID (Attack Shark X11)
40    Device Connection Message
03    Charging in progress
45    Battery = 69%
```

## Observed Behaviors

1. a medição de porcetagem é meio imprecisa, o valor de porcentagem pode ser menor ou maior que o real.
2. quando o dispositivo estiver no modo de carregamento e o carregamento for concluido ele manda o buffer `03 55 40 02 64` apenas uma unica vez, dizendo que está carregado.

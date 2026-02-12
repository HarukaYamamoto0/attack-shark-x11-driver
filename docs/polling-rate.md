# 🧪 Polling Rate Configuration

## 🎯 Purpose

Configures the USB polling rate used by the device to report input data to the host.

This affects latency, power consumption, and CPU usage.

## 📐 Value Encoding

The polling rate is selected using a **bitmask-style encoded value**, where lower values represent higher polling frequencies.

### Supported Values

| Polling Rate | Encoded Value |
|--------------|---------------|
| 125 Hz       | `0x08`        |
| 250 Hz       | `0x04`        |
| 500 Hz       | `0x02`        |
| 1000 Hz      | `0x01`        |

⚠️ Only one value must be set at a time.

## 🧩 Report Layout

| Index (0-based) | Name               | Description          |
|-----------------|--------------------|----------------------|
| 0               | Report ID          | Always `0x06`        |
| 1               | Length             | Always `0x09`        |
| 2               | Command Group      | Fixed (`0x01`)       |
| 3               | Polling Rate Value | Encoded polling rate |
| 4               | Checksum           | Complement of Value  |
| 5               | Reserved           | Always `0x00`        |
| 6               | Reserved           | Always `0x00`        |
| 7               | Reserved           | Always `0x00`        |
| 8               | Reserved           | Always `0x00`        |

## 🔐 Checksum

* **Byte:** 5 (1-based) / index 4 (0-based)
* **Algorithm:** Bitwise complement (NOT) of the Polling Rate Value (Byte 4).

### Observed Formula

```text
checksum = 0xFF - report[3]
```

### Validation Examples

| Polling Rate | Bytes (ID + Len + Cmd + Value) | Checksum | Match Formula (0xFF - Value)? |
|--------------|--------------------------------|----------|-------------------------------|
| 125 Hz       | `06 09 01 08`                  | `0xF7`   | Yes (`0xFF - 0x08 = 0xF7`)    |
| 250 Hz       | `06 09 01 04`                  | `0xFB`   | Yes (`0xFF - 0x04 = 0xFB`)    |
| 500 Hz       | `06 09 01 02`                  | `0xFD`   | Yes (`0xFF - 0x02 = 0xFD`)    |
| 1000 Hz      | `06 09 01 01`                  | `0xFE`   | Yes (`0xFF - 0x01 = 0xFE`)    |

## 🧪 USB Setup Packet

```txt
bmRequestType: 0x21 (Host → Device | Class | Interface)
bRequest: 0x09 (SET_REPORT)
wValue: 0x0306
wIndex: HID Interface
wLength: 9
```

## 📤 Examples

### Example — 125 Hz (Power Saving)

```txt
06 09 01 08 f7 00 00 00 00
```

### Example — 250 Hz (Office)

```txt
06 09 01 04 fb 00 00 00 00
```

### Example — 500 Hz (Gaming)

```txt
06 09 01 02 fd 00 00 00 00
```

### Example — 1000 Hz (E-Sports)

```txt
06 09 01 01 fe 00 00 00 00
```
# 🔑 Key Response Time (Debounce Configuration)

This feature configures the key/button response (debounce) time of the device.

## 📐 Range and Encoding

* **Range:** 4 ms → 50 ms
* **Step:** 2 ms
* **Encoding:** indexed value (not milliseconds directly)

## 🧩 Report Layout

| Byte | Index | Name           | Description            |
|------|-------|----------------|------------------------|
| 1    | 0     | Report ID      | Always `0x05`          |
| 2    | 1     | Length         | Always `0x0F`          |
| 3    | 2     | Command Group  | Fixed (`0x01`)         |
| 4    | 3     | Command        | Fixed (`0x30`)         |
| 5    | 4     | Subcommand     | Fixed (`0x04`)         |
| 6    | 5     | Vendor Tag     | Fixed (`0xA8`)         |
| 7    | 6     | Reserved       | Always `0x00`          |
| 8    | 7     | Reserved       | Always `0xFF`          |
| 9    | 8     | Reserved       | Always `0x00`          |
| 10   | 9     | Reserved       | Always `0x01`          |
| 11   | 10    | Response Index | Encoded debounce value |
| 12   | 11    | Flag           | Always `0x01`          |
| 13   | 12    | Checksum       | Sum-based checksum     |
| 14   | 13    | Padding        | Always `0x00`          |
| 15   | 14    | Padding        | Always `0x00`          |

### Encoding Formula

```text
encoded_value = ((milliseconds - 4) / 2) + 0x02
```

### Examples

| Milliseconds | Encoded Byte |
|--------------|--------------|
| 4 ms         | 0x02         |
| 6 ms         | 0x03         |
| 8 ms         | 0x04         |
| 10 ms        | 0x05         |
| …            | …            |
| 50 ms        | 0x19         |

## 🧩 Report Structure

* **Report length:** 15 bytes
* **Report ID:** `0x05`
* **Report Type:** Feature
* **Value byte:**

    * Byte **11** (1-based)
    * Index **10** (0-based)
* **Checksum byte:**

    * Byte **13** (1-based)
    * Index **12** (0-based)

## 🔐 Checksum

The checksum is **not incremental**, even though it may appear linear when only one field changes.

It is calculated as:

> The sum of a fixed subset of report bytes, masked to eight bits.

### Observed Rule

```text
checksum = sum(report[3 .. 10]) & 0xFF
```

⚠️ The checksum appears to increase sequentially **only because the encoded value changes linearly**.
If any other field changes, this pattern will no longer hold.

## 🧪 USB Setup (SET_REPORT)

```txt
bmRequestType: 0x21 (Host → Device | Class | Interface)
bRequest: 0x09 (SET_REPORT)
wValue: 0x0305
    Report Type: Feature (3)
    Report ID: 0x05
wIndex: 0x0002 (Interface)
wLength: 15
```

## 📤 Example — 4 ms

### Request

```txt
05 0f 01 30 04 a8 00 ff 00 01 02 01 de 00 00
```

### Response

* No data payload is returned
* Control transfer completes successfully
* USB status: `USBD_STATUS_SUCCESS`
* Endpoint: Control OUT (EP0)

## 📤 Example — 50 ms

```txt
05 0f 01 30 04 a8 00 ff 00 01 19 01 f5 00 00
```

## 📌 Device Behavior

* The device **does not return any data** in response to this command
* A successful application is indicated by:

    * completion of the control transfer
    * absence of `STALL`
    * USB status success

## 🧠 Notes

* Values outside the valid range may be:

    * ignored
    * silently clamped by firmware
* There is no logical ACK beyond USB transfer success
* Firmware validation is limited to:

    * report structure
    * checksum correctness
# Polling Rate

> [!TIP]
> To better understand this documentand this document, read the `README.md` located in the root of this directory first.

The **polling rate** defines how frequently the host checks the mouse for new input data.

Measured in Hertz (Hz), it determines the number of polling intervals per second. For example, a polling rate of **1000
Hz** corresponds to a nominal interval of **1 ms** between polls.

Higher polling rates can reduce the time between input updates, potentially improving responsiveness. However, the
actual latency depends on additional factors, including the connection type, device firmware, USB scheduling, and
operating system.

## Structure

The command payload consists of a **9-byte buffer**. The same structure is used for both **Wired** and **Wireless**
connections.

| Offset | Example | Description   |
|--------|---------|---------------|
| 0      | `0x06`  | Report ID     |
| 1      | `0x09`  | Report Length |
| 2      | `0x01`  | Profile ID    |
| 3      | `0x01`  | Polling Rate  |
| 4      | `0xFE`  | Checksum      |
| 5      | `0x00`  | Padding       |
| 6      | `0x00`  | Padding       |
| 7      | `0x00`  | Padding       |
| 8      | `0x00`  | Padding       |

The **Profile ID** identifies the profile to which the polling rate setting applies.

The **Polling Rate** field contains a device-specific value representing the desired polling frequency. These values are
not standardized by the USB HID specification and may differ between device models.

### Polling Rate Values

For the **Attack Shark X11** and compatible models supporting polling rates up to **1000 Hz**, the following mapping is
used:

| Rate (Hz) | Hex Value | Profile Name |
|-----------|-----------|--------------|
| 125 Hz    | `0x08`    | Power Saving |
| 250 Hz    | `0x04`    | Office       |
| 500 Hz    | `0x02`    | Gaming       |
| 1000 Hz   | `0x01`    | eSports      |

This mapping is specific to the supported device protocol and should not be assumed to apply to all mice limited to 1000
Hz.

Some models supporting polling rates up to **8000 Hz** use a different encoding scheme, such as:

| Rate (Hz) | Hex Value |
|-----------|-----------|
| 125 Hz    | `0x01`    |
| 250 Hz    | `0x02`    |
| 500 Hz    | `0x03`    |
| 1000 Hz   | `0x04`    |
| 2000 Hz   | `0x05`    |
| 4000 Hz   | `0x06`    |
| 8000 Hz   | `0x07`    |

**Important:** This alternative mapping is provided for reference only. Polling rate encodings are manufacturer- and
model-specific, and compatibility must be verified before applying them to other devices.

### Checksum

The byte at offset `4` contains a simple **one's complement checksum** calculated from the polling rate value at offset
`3`.

The calculation is:

```typescript
const checksum = 0xFF - buffer[3];
```

This complement mechanism provides a basic consistency check for the polling rate field. It is not a cryptographic
checksum and does not protect the entire payload against corruption.

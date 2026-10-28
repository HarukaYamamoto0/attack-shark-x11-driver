## HID Report Descriptors

This directory contains raw HID Report Descriptors collected from the Attack Shark X11 and other compatible mice during reverse engineering.

The descriptors are preserved as closely as possible to their original form, using [`usbhid-dump`](https://github.com/DIGImend/usbhid-dump) to capture the data directly from the devices.

Rather than storing interpreted representations or tool-specific schemas, the goal is to retain the original descriptor bytes in a standardized, human-readable hexadecimal format.

This approach provides several advantages:

- **Data integrity:** Preserves the original descriptor bytes without introducing interpretation errors.
- **Tool independence:** Allows the descriptors to be analyzed using different HID parsers and debugging tools.
- **Reproducibility:** Enables other developers to independently inspect and verify the device's HID structure.
- **Compatibility analysis:** Makes it easier to compare HID interfaces, Report IDs, and report layouts across different devices and firmware versions.

### Capturing Descriptors

HID Report Descriptors can be extracted using `usbhid-dump` by specifying the device's USB Vendor ID (VID) and Product ID (PID).

For example:

```shell
sudo usbhid-dump -m 1d57:fa60 -e descriptor
```

The following output demonstrates a capture containing four HID interfaces:

```text
003:005:003:DESCRIPTOR         1793164826.046660
 05 01 09 06 A1 01 15 00 25 01 75 01 95 70 05 07
 19 E0 29 E7 19 00 29 67 81 02 C0

003:005:002:DESCRIPTOR         1793164826.049152
 05 01 09 80 A1 01 85 01 05 01 19 81 29 83 15 00
 25 01 95 03 75 01 81 06 95 01 75 05 81 01 C0 05
 0C 09 01 A1 01 85 02 15 00 26 80 03 19 00 2A 80
 03 75 10 95 01 81 00 C0 05 0A 09 00 A1 01 85 03
 19 00 29 00 15 00 25 00 75 08 95 04 81 01 C0 05
 0B 09 00 A1 01 85 04 95 37 B1 01 85 05 95 0E B1
 01 85 06 95 08 B1 01 85 07 95 07 B1 01 85 08 95
 3A B1 01 85 09 95 3F B1 01 85 0A 95 07 B1 01 85
 0B 95 07 B1 01 85 0C 95 09 B1 01 85 10 95 07 B1
 01 85 A0 95 07 B1 01 85 22 95 85 B1 01 85 23 95
 85 B1 01 85 24 95 07 B1 01 85 25 95 0E B1 01 85
 26 95 08 B1 01 85 27 95 07 B1 01 85 28 95 84 B1
 01 85 29 95 3F B1 01 85 2A 95 84 B1 01 85 2B 95
 07 B1 01 85 2C 95 09 B1 01 85 2D 95 84 B1 01 85
 2E 95 06 B1 01 C0

003:005:001:DESCRIPTOR         1793164826.050888
 05 01 09 02 A1 01 09 01 A1 00 05 09 19 01 29 05
 15 00 25 01 95 05 75 01 81 02 95 01 75 03 81 01
 05 01 09 30 09 31 16 01 80 26 FF 7F 75 10 95 02
 81 06 09 38 15 81 25 7F 75 08 95 01 81 06 05 0C
 0A 38 02 95 01 81 06 C0 C0

003:005:000:DESCRIPTOR         1793164826.051971
 05 01 09 06 A1 01 05 07 19 E0 29 E7 15 00 25 01
 95 08 75 01 81 02 95 01 75 08 81 03 95 06 75 08
 15 00 26 FF 00 05 07 19 00 2A FF 00 81 00 25 01
 95 05 75 01 05 08 19 01 29 05 91 02 95 01 75 03
 91 03 C0
```

Each descriptor begins with a header containing the USB bus number, device address, interface number, and capture timestamp.

The hexadecimal bytes that follow represent the actual HID Report Descriptor, defining the device's HID collections, usages, report fields, and report sizes.

These descriptors describe the structure of HID reports, **not the contents or semantics of proprietary commands exchanged with the device**.

For more information about HID descriptors and their structure, refer to the [USB HID Specification](https://www.usb.org/sites/default/files/hid1_11.pdf).

### Bootloader Mode Descriptors

The [`x11/bootloader`](./x11/bootloader) directory contains HID Report Descriptors captured while the Attack Shark X11 was operating in bootloader mode.

These descriptors are stored separately from those captured during normal operation because the device may expose a different USB/HID configuration while in bootloader mode.

The circumstances under which the mouse entered this mode, along with the findings from the investigation, are documented in [Issue #1 of the Dorsal repository](https://github.com/Zelozzzz/dorsal/issues/1).

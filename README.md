# Attack Shark X11 – Linux Driver & Reverse Engineering

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HarukaYamamoto0/attack-shark-x11-driver)

Open-source effort to provide **Linux support for the Attack Shark X11 gaming mouse**.

The official configuration software is **Windows-only**, so this project reversely engineers
the device's USB protocol to build cross-platform tooling and drivers.

The long-term goal is to make the device configurable on Linux and potentially integrate
support into projects such as libratbag.

# Project Goals

This repository focuses on three main areas:

• Reverse engineering the USB HID protocol used by the mouse
• Documenting the protocol for future developers
• Building open tools and drivers for Linux

# Reverse Engineering Methodology

The protocol was analyzed using:

- Wireshark
- USBPcap
- Windows vendor software

Captured USB traffic was compared against configuration changes in the Windows software
to determine packet structure and command behavior.

A **TypeScript test environment** is used to rapidly prototype commands before implementing
them in native drivers.

Protocol documentation and captured traffic samples can be found in `docs/`

# Supported Hardware

Currently tested with:

| Device           | Mode            | Status     |
|------------------|-----------------|------------|
| Attack Shark X11 | Wired           | Supported  |
| Attack Shark X11 | 2.4GHz wireless | Supported  |
| Attack Shark X11 | Bluetooth       | Not tested |

Some other models may share the same protocol:

| Device          | Status              |
|-----------------|---------------------|
| Attack Shark R1 | Possibly compatible |

Additional testing and reverse engineering would be required.

# Features of the Original Software

The Windows configuration tool provides the following features.

Legend
✅ Implemented
⚠️ Work in progress
❌ Not implemented

| Feature           | Description                  | Status |
|-------------------|------------------------------|--------|
| Button remapping  | Change button behavior       | ✅      |
| Macro manager     | Create custom macros         | ✅      |
| Battery status    | Display device battery level | ✅      |
| Reset profile     | Restore profile defaults     | ✅      |
| DPI configuration | Configure DPI stages         | ✅      |
| Lighting control  | LED configuration            | ✅      |
| Polling rate      | 125 / 250 / 500 / 1000 Hz    | ✅      |
| Power manager     | Configure sleep timers       | ✅      |
| Key response time | 4ms – 50ms                   | ✅      |
| Ripple control    | Enable / disable             | ✅      |
| Angle snap        | Enable / disable             | ✅      |

## Important ⚠️

Sending configuration packets too quickly can cause the device firmware
to stop responding.

Always introduce a delay between transfers.

Minimum safe delay:

```
250 ms
```

If the mouse becomes unresponsive, it can usually be recovered by:

1. Switching to **Bluetooth mode**
2. Waiting a few seconds
3. Switching back to **2.4 GHz wireless**

After recovery, restoring the default configuration is recommended.

# Linux Device Access (udev)

To allow non-root access to the device, create an udev rule.

## Create the rule

```
sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
```

Add:

```
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa60", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa55", MODE="0666", GROUP="plugdev"
```

Reload rules:

```
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Or reboot the system.

# Contributing

Contributions are welcome.

Useful contributions include:

• Additional USB traffic captures
• Testing with other Attack Shark devices
• Protocol documentation improvements
• Driver implementations

# Disclaimer

This project is **not affiliated with Attack Shark**.

All trademarks belong to their respective owners.

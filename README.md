# attack-shark-x11-driver

[![npm version](https://img.shields.io/npm/v/attack-shark-x11-driver.svg)](https://www.npmjs.com/package/attack-shark-x11-driver)
[![license](https://img.shields.io/npm/l/attack-shark-x11-driver.svg)](https://github.com/HarukaYamamoto0/attack-shark-x11-driver/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HarukaYamamoto0/attack-shark-x11-driver)

A TypeScript driver for the **Attack Shark X11 gaming mouse**, providing cross-platform support (focused on Linux) to configure DPI, macros, lighting, and polling rates via USB HID.

The official software is Windows-only; this project provides a way to interact with the device on any platform supported by Node.js or Bun.

## Features

- ✅ **DPI Configuration**: Set stages and active stage.
- ✅ **Button Remapping**: Fully customizable button behavior.
- ✅ **Macros**: Support for custom macros and templates.
- ✅ **Lighting Control**: Change modes and speeds.
- ✅ **Polling Rate**: Support for 125 Hz to 1000 Hz.
- ✅ **Battery Status**: Real-time battery monitoring.
- ✅ **Cross-platform**: Works on Linux, macOS, and Windows.

## Installation

```bash
bun add attack-shark-x11-driver
# or
npm install attack-shark-x11-driver
```

## Quick Start

```typescript
import { AttackSharkX11, ConnectionMode, Rate } from 'attack-shark-x11-driver';

const driver = new AttackSharkX11({
  connectionMode: ConnectionMode.Adapter, // or Wired
  delayMs: 300 // Recommended safe delay between packets
});

try {
  await driver.open();

  // Set Polling Rate to 1000Hz (eSports)
  await driver.setPollingRate(Rate.eSports);

  // Configure DPI Stages
  await driver.setDpi({
    dpiValues: [800, 1600, 2400, 3200, 5000, 22000],
    activeStage: 2
  });

  // Get Battery Level
  const battery = await driver.getBatteryLevel();
  console.log(`Battery: ${battery}%`);

} catch (error) {
  console.error('Driver error:', error);
} finally {
  await driver.close();
}
```

## Linux Setup (udev)

To access the device without root permissions on Linux, you need to create an udev rule:

1. Create the rule file:
   ```bash
   sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
   ```
2. Add the following lines:
   ```udev
   SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa60", MODE="0666", GROUP="plugdev"
   SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa55", MODE="0666", GROUP="plugdev"
   ```
3. Reload rules:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

## Supported Hardware

| Device           | Mode            | Status     |
|------------------|-----------------|------------|
| Attack Shark X11 | Wired           | Supported  |
| Attack Shark X11 | 2.4GHz wireless | Supported  |
| Attack Shark X11 | Bluetooth       | Not tested |

*Note: Attack Shark R1 might be compatible but hasn't been verified yet.*

## Important Warnings ⚠️

- **Packet Delay**: Sending configuration packets too quickly can cause the firmware to hang. Always maintain at least a **250 ms** (500 ms recommended) delay between commands.
- **Recovery**: If the mouse stops responding, switch it to Bluetooth mode for a few seconds, then back to 2.4 GHz/Wired.

## Contributing

This project is a reverse-engineering effort. Contributions such as protocol documentation, new features, or testing with different hardware are very welcome.

- **Protocol Docs**: See `docs/` for packet analysis.
- **Tools used**: Wireshark, USBPcap.

## License

MIT © [HarukaYamamoto0](https://github.com/HarukaYamamoto0)

---

*Disclaimer: This project is not affiliated with Attack Shark. Use at your own risk.*

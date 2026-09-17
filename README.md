# attack-shark-x11-driver

[![npm version](https://img.shields.io/npm/v/attack-shark-x11-driver.svg)](https://www.npmjs.com/package/attack-shark-x11-driver)
[![license](https://img.shields.io/npm/l/attack-shark-x11-driver.svg)](https://github.com/HarukaYamamoto0/attack-shark-x11-driver/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat\&logo=bun\&logoColor=white)](https://bun.sh)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HarukaYamamoto0/attack-shark-x11-driver)

A TypeScript driver for the **Attack Shark X11 gaming mouse**, providing cross-platform support, primarily focused on
Linux, for configuring DPI, button mappings, macros, lighting, and polling rates through USB HID.

The official software is Windows-only. This project provides a way to communicate with the device from any platform
supported by Node.js, Bun, and the underlying HID implementation.

## Project Status

Reverse engineering is currently ongoing, albeit at a slower pace.

Reverse engineering proprietary hardware and undocumented protocols requires a significant amount of time. Although I
truly enjoy this work, it does not generate a direct financial return at the moment, and I need to balance my time
between work, studies, and other responsibilities.

Under different circumstances, I would gladly dedicate most of my time to reverse engineering. Unfortunately,
maintaining that level of dedication is not sustainable right now.

The existing implementation, documentation, data captures, and research will remain publicly available so that other
developers can continue the work.

Issues and pull requests are still welcome. I will review them whenever my time permits, but there is no guarantee
regarding response times, release schedules, or development roadmaps.

## Features

* ✅ **DPI Configuration**: Configure DPI stages and select the active stage.
* ✅ **Button Remapping**: Customize button behavior.
* ✅ **Macros**: Create and configure macros.
* ✅ **Lighting Control**: Configure lighting modes and animation speeds.
* ✅ **Polling Rate**: Support for 125 Hz to 1000 Hz.
* ✅ **Cross-platform**: Primarily tested on Linux.
* ✅ **Battery Status**: Real-time battery monitoring.
* ✅ **Command Confirmation**: Confirm whether commands were received and accepted by the device.
* [ ] **Reading Settings**: Read the current configuration from the mouse.

## Package Limitations

The package can be used directly in Node.js and Bun applications, but some environments such as Electron and Tauri may
exhibit unexpected behavior depending on their HID implementation and process architecture.

As discussed in issue [#9](https://github.com/HarukaYamamoto0/attack-shark-x11-driver/issues/9), a lower-level
implementation using Rust would likely provide better control and reliability.

For Tauri, use this package solely for generating, parsing, and manipulating protocol buffers, while sending the actual
HID reports through a native crate such as [hidapi](https://docs.rs/hidapi/latest/hidapi/).

## Quick Start

```typescript
import { AttackSharkX11, CommandConfirmation, Rate } from './src';

const driver = new AttackSharkX11();

try {
	await driver.open();

	const commandConfirmation = await driver.setPollingRate(Rate.office);
	if (commandConfirmation === CommandConfirmation.Success) console.log('Command confirmed.');

	const response = await driver.getPollingRate();
	if (response) console.log('Current polling rate:', response);
} catch (error) {
	console.error('Error:', error);
} finally {
	await driver.close();
	console.log('\nDriver closed.');
}
```

## Linux Setup

To access the device without root privileges on Linux, create an udev rule.

### 1. Create the rule file

```bash
sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
```

### 2. Add the rules

```udev
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa60", MODE="0660", GROUP="plugdev", TAG+="uaccess"
KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa55", MODE="0660", GROUP="plugdev", TAG+="uaccess"
```

> Some distributions do not provide the `plugdev` group by default.
>
> If the group does not exist, remove `GROUP="plugdev"` and rely on `TAG+="uaccess"`.

### 3. Reload the rules

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### 4. Reconnect the device

Disconnect and reconnect the mouse.

Depending on the distribution and session manager, logging out and back in may also be required before the new
permissions are applied.

## Supported Hardware

| Device           | Connection mode  | Status     |
|------------------|------------------|------------|
| Attack Shark X11 | Wired            | Supported  |
| Attack Shark X11 | 2.4 GHz wireless | Supported  |
| Attack Shark X11 | Bluetooth        | Not tested |

The Attack Shark R1 may use a compatible protocol, but this has not been verified.

### Supported Runtimes

| Runtime  | Status       |
|----------|--------------|
| Node.js  | Supported    |
| Bun      | Supported    |
| Electron | Experimental |
| Tauri    | Experimental |

## Important Warnings

* **Device recovery:** If the mouse stops responding, switch it to Bluetooth mode for a few seconds and then switch it
  back to wired or 2.4 GHz mode.
* **Protocol safety:** Avoid sending unknown or malformed packets. Some configuration fields may be persisted directly
  to the device.
* **Command timing:** Sending multiple commands without sufficient delay may cause packets to be dropped.
* **Platform support:** The project is designed to be cross-platform, but Linux has received the most testing.
* **No firmware recovery:** This project does not currently provide firmware flashing or recovery capabilities.

## Protocol Documentation

Protocol research and packet documentation are available in the [`docs/`](./docs) directory.

The reverse-engineering process involved tools and techniques such as:

* Wireshark
* USBPcap
* HID feature report inspection
* Static analysis of official software
* Crawling web-based driver resources
* Comparing configuration packets across different mouse models

Some protocol fields remain undocumented or only partially understood.

## Contributing

Contributions are welcome, particularly in areas where physical hardware access or additional protocol captures are
required.

Useful contributions include:

* Testing with other mouse models
* USBPcap or Wireshark captures
* Documentation of unknown packet fields
* Protocol analysis
* Bug fixes
* Rust or native HID implementations
* Firmware extraction and analysis
* Hardware teardown documentation
* Improvements to tests and packet validation

When reporting compatibility with another device, include as much information as possible:

* Mouse model
* USB VID and PID
* Connection mode
* Official driver version
* Captured requests and responses
* Whether the device recovered normally after testing

Pull requests and issues will be reviewed when time permits.

## Supporting the Project

This project exists because of many hours spent analyzing proprietary software, capturing USB HID traffic, documenting
undocumented protocols, testing hardware behavior, and building an independent cross-platform implementation.

Active reverse-engineering work is paused because this level of research is challenging to sustain without financial
support.

Financial contributions do not guarantee new features or releases, but they may make it possible for me to dedicate
additional time to protocol research, documentation, testing, and broader device support in the future.

### Sponsors

* GitHub Sponsors: https://github.com/sponsors/HarukaYamamoto0
* Ko-fi: https://ko-fi.com/harukayamamoto0

Non-financial contributions are also valuable. Protocol captures, device testing, documentation, hardware information,
issues, and pull requests can help keep the research useful to the community.

## License

MIT © [HarukaYamamoto0](https://github.com/HarukaYamamoto0)

---

*Disclaimer: This project is not affiliated with or endorsed by Attack Shark. Use it at your own risk.*

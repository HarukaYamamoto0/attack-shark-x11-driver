# attack-shark-x11-driver

[![npm version](https://img.shields.io/npm/v/attack-shark-x11-driver.svg)](https://www.npmjs.com/package/attack-shark-x11-driver)
[![license](https://img.shields.io/npm/l/attack-shark-x11-driver.svg)](https://github.com/HarukaYamamoto0/attack-shark-x11-driver/blob/main/LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HarukaYamamoto0/attack-shark-x11-driver)
[![codecov](https://codecov.io/gh/HarukaYamamoto0/attack-shark-x11-driver/branch/main/graph/badge.svg?token=6GURT5NZJ3)](https://codecov.io/gh/HarukaYamamoto0/attack-shark-x11-driver)

A TypeScript driver for the **Attack Shark X11 gaming mouse**, providing cross-platform support (focused on Linux) to
configure DPI, macros, lighting, and polling rates via USB HID.

The official software is Windows-only; this project provides a way to interact with the device on any platform supported
by Node.js or Bun.

## Features

- ✅ **DPI Configuration**: Set stages and active stage.
- ✅ **Button Remapping**: Fully customizable button behavior.
- ✅ **Macros**: Support for custom macros and templates.
- ✅ **Lighting Control**: Change modes and speeds.
- ✅ **Polling Rate**: Support for 125 Hz to 1000 Hz.
- ✅ **Cross-platform**: Linux focused
- [ ] **Battery Status**: Real-time battery monitoring.
- [ ] **Reading:** Read the current mouse settings.
- [ ] **Execution confirmation:** Confirm whether the command was successfully sent and accepted.

## About the attack-shark-x11-driver package

Right now, I’m focusing more on reverse-engineering the mouse. Although it may function properly in some applications,
it still exhibits strange behavior when used in programs like Electron or Tauri.

As mentioned in issue [#9](https://github.com/HarukaYamamoto0/attack-shark-x11-driver/issues/9), I plan to resolve this
by lowering the level, in other words, by using Rust. Of course, if you use Tauri, you can use this package to
simply generate and manipulate buffers and then send them using crates
like [hidapi](https://docs.rs/hidapi/latest/hidapi/). I’d actually recommend doing this.

## Quick Start

```typescript
import { AttackSharkX11, ConnectionMode, Rate } from 'attack-shark-x11-driver';

const driver = new AttackSharkX11({
	connectionMode: ConnectionMode.Adapter, // or Wired
	delayMs: 300, // Recommended safe delay between packets
});

try {
	await driver.open();

	// Set Polling Rate to 1000Hz (eSports)
	await driver.setPollingRate(Rate.eSports);

	// Configure DPI Stages
	await driver.setDpi({
		dpiValues: [800, 1600, 2400, 3200, 5000, 22000, 0, 0], // Yes, in reality, there are 8 stages, not 6.
		activeStage: 2,
	});
} catch (error) {
	console.error('Driver error:', error);
} finally {
	await driver.close();
}
```

The `delayMs` option exists because the protocol currently lacks command acknowledgment handling. Until proper response
validation is implemented, a delay of approximately 250 ms between commands is recommended.

## Linux Setup (udev)

To access the device without root privileges on Linux, create the following udev rule:

1. Create the rule file:

	```bash
	sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
	```

2. Add:

    ```udev
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa60", MODE="0660", GROUP="plugdev", TAG+="uaccess"
    KERNEL=="hidraw*", SUBSYSTEM=="hidraw", ATTRS{idVendor}=="1d57", ATTRS{idProduct}=="fa55", MODE="0660", GROUP="plugdev", TAG+="uaccess"
    ```

	> Some distributions do not provide the `plugdev` group by default.
	> If `plugdev` does not exist, remove `GROUP="plugdev"` and rely solely on `TAG+="uaccess"`.

3. Reload the rules:

	```bash
	sudo udevadm control --reload-rules
	sudo udevadm trigger
	```

4. Disconnect and reconnect the mouse, or log out and log back in.

## Supported Hardware

| Device           | Mode            | Status     |
|------------------|-----------------|------------|
| Attack Shark X11 | Wired           | Supported  |
| Attack Shark X11 | 2.4GHz wireless | Supported  |
| Attack Shark X11 | Bluetooth       | Not tested |

_Note: Attack Shark R1 might be compatible but hasn't been verified yet._

### Supported runtimes

- Node.js: Supported
- Bun: Supported
- Electron: Experimental
- Tauri: Experimental

## Important Warnings ⚠️

- **Recovery**: If the mouse stops responding, switch it to Bluetooth mode for a few seconds, then back to 2.4
  GHz/Wired.
- **Cross-platform**: Designed to work on Linux, Windows, and macOS, although Linux currently receives the most testing.

## Contributing

This project is a reverse-engineering effort. Contributions such as protocol documentation, new features, or testing
with different hardware are very welcome.

- **Protocol Docs**: See `docs/` for packet analysis.
- **Tools used**: Wireshark, USBPcap.

## Support the Project

This project exists because of many hours spent reverse engineering proprietary drivers, analyzing USB HID traffic,
documenting protocols, and testing hardware behavior.

Recent reverse-engineering efforts uncovered support for dozens of additional devices and features. While this opens the
door for significantly broader hardware support, understanding and documenting these protocols requires a significant
amount of time and effort.

If this project is useful to you, consider supporting its development. Financial contributions help justify spending
more time on reverse engineering, protocol research, testing, documentation, and implementing support for additional
devices.

Your support directly contributes to:

* Expanding support for new mouse models
* Documenting undocumented protocol features
* Improving stability and reliability
* Developing configuration and tooling utilities
* Maintaining long-term compatibility across platforms

### Sponsor

* GitHub Sponsors: https://github.com/sponsors/HarukaYamamoto0
* Ko-fi: https://ko-fi.com/harukayamamoto0

Even if you cannot contribute financially, bug reports, protocol captures, testing, and documentation improvements are
greatly appreciated.

## License

MIT © [HarukaYamamoto0](https://github.com/HarukaYamamoto0)

---

_Disclaimer: This project is not affiliated with Attack Shark. Use at your own risk._

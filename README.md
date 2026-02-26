## Attack Shark X11 – Reverse Engineering Project

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/HarukaYamamoto0/attack-shark-x11-driver)

This project is an attempt to reverse-engineer the **Attack Shark X11** mouse.

Unfortunately, the official configuration software for this mouse is **only available on Windows**.
Because of that, and purely as a learning exercise in my free time, I’m analyzing the device’s USB protocol using *
*Wireshark + USBCAP**, with the goal of eventually building a usable driver / configuration tool for other platforms.

I’m using **TypeScript** as a testing environment because it speeds up iteration and experimentation.
Several captured communication samples can be found in the `samples/` directory.

## Original Windows Software Features

The official configuration panel provides the following features:

✅ = fully implemented<br>
⚠️ = under development<br>
❌ = Not yet implemented<br>

| Option                | Description                                              | Implementation |
|-----------------------|----------------------------------------------------------|----------------|
| Button settings       | Change button behavior and mappings                      | ✅              |
| Macro Manager         | Configure and manage custom macros.                      | ❌              |
| Power                 | Displays mouse battery status                            | ❌              |
| Reset profile         | Resets the current profile                               | ✅              |
| DPI settings          | Configure DPI stages and values per stage                | ✅              |
| Light settings        | Configure the mouse LED                                  | ✅              |
| Polling rate settings | Set polling rate (4 predefined options)                  | ✅              |
| Power manager         | Two sliders to configure sleep and deep sleep timing     | ✅              |
| Key response time     | Slider from 4ms (step 2ms) up to 50ms                    | ✅              |
| Ripple control        | On / Off                                                 | ✅              |
| Angle snap            | On / Off                                                 | ✅              |

## Linux Access (udev Rules)

To avoid constantly running the Windows software inside a VM, I use Windows directly when capturing traffic.
However, if you want to start testing this project on **Linux**, you’ll need to create **udev rules** to allow
user-level access to the device.

### Create udev rule

Create the following file:

```bash
sudo nano /etc/udev/rules.d/99-attack-shark-x11.rules
```

Add the content below:

```udev
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa60", MODE="0666", GROUP="plugdev" # wireless
SUBSYSTEM=="usb", ATTR{idVendor}=="1d57", ATTR{idProduct}=="fa55", MODE="0666", GROUP="plugdev" # wired
```

> `0666` = read/write access for user
> `plugdev` is standard on most desktop Linux distros (Linux Mint included)

### Apply the rules

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

Or, the lazy but effective way:

```bash
sudo reboot
```

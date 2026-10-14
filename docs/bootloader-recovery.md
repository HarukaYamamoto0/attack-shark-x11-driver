# Attack Shark X11 stuck in Beken bootloader (A745:0033): recovery guide

> **Symptoms:** Your Attack Shark X11 suddenly stops working, neither 2.4 GHz nor Bluetooth responds, and connecting it
> by USB shows **`A745:0033 Beken HID Mouse`** instead of the normal Attack Shark device. This guide documents one
> confirmed cause and recovery procedure.
>
> **Scope:** This is a recovery procedure for an X11 **stuck in bootloader mode with its original firmware still
present**. It is **not** a firmware flasher, and it cannot repair an erased or corrupted firmware image.

This issue was reproduced and successfully recovered on an Attack Shark X11 on **October 2, 2026**. The root cause and
recovery method were identified by [Zelozzzz](https://github.com/Zelozzzz), who reverse-engineered the relevant Beken
BK3633 bootloader behavior and wrote the [
`x11_unstick.py` recovery tool](https://github.com/Zelozzzz/dorsal/blob/main/tools/x11_unstick/x11_unstick.py). The full
investigation and test results are recorded
in [Dorsal issue #1](https://github.com/Zelozzzz/dorsal/issues/1?timeline=1).

## How to recognize the problem

During normal operation, the X11 was observed using the following USB IDs:

| State / connection        | VID:PID         | Notes                                               |
|---------------------------|-----------------|-----------------------------------------------------|
| Normal, wired             | `1D57:FA55`     | Observed before the incident                        |
| Normal, 2.4 GHz           | `1D57:FA60`     | Observed before the incident                        |
| Stuck in Beken bootloader | **`A745:0033`** | USB device identifies itself as **Beken HID Mouse** |

The bootloader exposes a generic 64-byte HID input/output interface rather than the normal mouse interfaces. Switching
modes, reconnecting the USB cable, or restarting the computer does not necessarily restore normal operation.

**On Linux**, connect the mouse directly by cable and inspect its USB identity:

```bash
lsusb -d a745:0033
```

**On Windows**, check **Device Manager → device Properties → Details → Hardware Ids** for `VID_A745&PID_0033`. The
device may be listed as *Beken HID Mouse*.

**Important:** `A745:0033` identifies a Beken bootloader, not necessarily an Attack Shark X11. Only follow this guide if
you know the affected device is your X11. Disconnect other Beken devices before running the recovery tool.

## What caused it?

While investigating previously undocumented HID reports, I unintentionally triggered the bootloader-entry behavior
associated with **HID Feature Report `0x10`**. Subsequent firmware analysis established that **writing** this report
causes the X11 application firmware to:

1. Write a persistent bootloader-entry marker beginning with `12 34` (`0x1234`) to flash at address **`0x7D000`**.
2. Reset the microcontroller.
3. Boot into the BK3633 USB bootloader, which sees that marker and remains in bootloader mode.

The observed flag bytes began with:

```text
Address 0x7D000:
12 34 AA 00 00 20 00 00 00 00 00 00 00 00 00 00
```

The bootloader checks this flag again on each startup. **Rebooting alone does not clear it**, so the device repeatedly
returns as `A745:0033` even if its original firmware is intact.

An important distinction: **reading** report `0x10` was not found to trigger this behavior; the dangerous operation is
**writing** it. The initial experiment included HID operations around that report, and the exact triggering call was
only understood after Zelozzzz analyzed the firmware and updater behavior.

### Why the recovery works

Zelozzzz first recognized the bootloader's USB identity in an updater for a different BK3633-based mouse, then verified
the matching VID/PID, product strings, and HID descriptor against
the [Beken BK3633 SDK](https://github.com/himaexternal/BK3633_DesignKit_V06_220F).

The SDK's `projects/boot_usb_for_mouse/app/` code revealed two key details:

- The ordinary **reboot command does not erase** the bootloader-entry flag.
- The bootloader's **CRC-check command erases the flag at `0x7D000` before restarting**. It does not need to overwrite
  the existing application firmware to do so.

The recovery tool first checks that this really is the expected bootloader, reads the flag, backs up the flash region
accessible through the bootloader, and examines the firmware. Only after these checks does it offer to issue the
CRC-check command.

**Do not use the Kysona M600 recovery/updater tool on the X11.** Although it helped identify the protocol, it can flash
M600 firmware without checking the model. Firmware intended for a different mouse can make recovery substantially harder
or impossible using this method.

## Recovery: read and back up first

### 1. Get the recovery script from its author

Use the upstream, maintained version:

- **Source code:** [
  `tools/x11_unstick/x11_unstick.py`](https://github.com/Zelozzzz/dorsal/blob/main/tools/x11_unstick/x11_unstick.py)
- **Raw script:** [Download
  `x11_unstick.py`](https://raw.githubusercontent.com/Zelozzzz/dorsal/main/tools/x11_unstick/x11_unstick.py)

Save the file to a writable directory. Inspect the source before executing it; avoid modified copies from file-sharing
sites.

You will need **Python 3** and the `hidapi` Python package.

**Windows (PowerShell):** Run these commands from the directory containing `x11_unstick.py`:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install hidapi
.\.venv\Scripts\python.exe x11_unstick.py --check-only
```

**Linux:** Using a virtual environment avoids changing system Python packages:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install hidapi
sudo .venv/bin/python x11_unstick.py --check-only
```

The `sudo` invocation is only for opening the bootloader's HID device when your user does not have access. Existing udev
rules for `1D57:FA55` / `1D57:FA60` do **not** automatically apply to `A745:0033`. If you configure appropriate
bootloader-specific udev access, running as root is unnecessary. Close other applications that may have opened the
device.

### 2. Review the diagnostic output

The `--check-only` mode **does not perform the recovery command**. It checks the bootloader, reads available flash,
analyzes the firmware, and writes diagnostic files.

Example from the successfully recovered X11 (abbreviated):

```text
found A745:0033 HID Mouse
flag at 0x7d000: 12 34 AA 00 00 20 00 00 00 00 00 00 00 00 00 00
backing up: 100%
firmware header at 0x2b00a: ...
firmware crc matches its header (139e89d1)
backup saved: x11-backup-20000-7cfff-....bin
looks good: the flag is set and the firmware is still there, crc checked
--check-only, stopping here
```

The example firmware header address and CRC **are not universal constants**. Different firmware images may use different
values. What matters is that the tool recognizes the flag, validates the image where possible, and completes its backup.

The backup contains the **readable** range `0x20000` through `0x7CFFF`. It is **not a complete chip dump**: this
bootloader does not expose flash addresses below `0x20000` through its read command. Keep the `.bin` backup somewhere
safe; do not publish a firmware dump casually. The script also produces an `x11-report-....txt` diagnostic report.

**Stop here if the script reports `STOPPED`, cannot validate the expected bootloader, detects a CRC mismatch, or
indicates missing firmware.** Do not bypass the checks or try a firmware updater for another mouse.

If the script reports `mostly looks good` instead of a verified CRC, it found a plausible image but could **not** fully
validate it. The tool offers a separate `FIX ANYWAY` confirmation in that situation; this is a higher-risk path. Prefer
reviewing the diagnostic report with the tool's author or other experienced contributors before proceeding.

### 3. Clear the bootloader flag

If the initial run reports a validated firmware image and you have saved the backup, run the script again **without**
`--check-only`:

**Windows:**

```powershell
.\.venv\Scripts\python.exe x11_unstick.py
```

**Linux:**

```bash
sudo .venv/bin/python x11_unstick.py
```

It repeats the diagnostic and backup steps and, on a verified image, asks you to type **`FIX`**. Anything else cancels
the recovery command.

After confirmation, the tool issues the bootloader CRC-check request. In the confirmed case, that operation removed the
persistent bootloader flag, reset the chip, and allowed the existing X11 firmware to start. It **does change flash** by
clearing the flag, but **does not erase or reflash the mouse application firmware**.

A successful run should report that the mouse has reappeared as a normal device. Test **wired, 2.4 GHz, and Bluetooth**
operation, and confirm that your mouse software can communicate with it.

## Troubleshooting

| Problem                                                          | What to do                                                                                                                                                        |
|------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| No `A745:0033` device found                                      | Check the wired connection and hardware ID. This procedure does not apply unless the matching bootloader is present.                                              |
| Device found, but cannot open it                                 | Close other mouse software. On Linux, check access to the bootloader's `hidraw` device; the usual X11 udev rule has different IDs.                                |
| Old script hangs immediately after finding the device on Windows | Download the updated upstream script. An early version used `read(64, 0)`, which can block indefinitely; the fix uses a short non-zero timeout.                   |
| Flag `0x1234` is absent                                          | The bootloader is not being held by the flag described here. Do not force this recovery procedure.                                                                |
| CRC mismatch or damaged/missing firmware                         | Stop. Clearing the flag alone cannot restore a corrupted firmware image.                                                                                          |
| Tool says it cannot verify the CRC                               | Treat the `FIX ANYWAY` path as unverified and review the diagnostic report before accepting that risk.                                                            |
| Mouse reappears as `A745:0033` after the fix                     | It may be returning to the bootloader because the firmware is incomplete or invalid. Preserve the backup and report; do not flash firmware for a different model. |
| Mouse does not enumerate after the fix                           | Follow the tool's instructions to disconnect, wait, and reconnect once. If still absent, preserve the logs and seek model-specific recovery guidance.             |

## Technical notes and prevention

The relevant findings from Zelozzzz's investigation are:

| Component                                  | Finding                                                                                                                     |
|--------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Normal firmware, HID Feature Report `0x10` | A **write** initiates persistent bootloader entry; the firmware does not require a particular payload beyond the report ID. |
| Flash `0x7D000`                            | Stores the `0x1234` marker that keeps the bootloader active across power cycles.                                            |
| Bootloader USB ID                          | `A745:0033`, with a generic 64-byte HID input/output transport.                                                             |
| Bootloader read command `0x09`             | Allows reading flash 16 bytes at a time starting at `0x20000`, enabling diagnostics and a partial backup.                   |
| Bootloader reboot command                  | Restarts the chip but leaves the flag intact.                                                                               |
| Bootloader CRC-check command               | Clears the bootloader-entry marker and restarts the chip. This is the controlled action used by `x11_unstick.py`.           |
| Firmware image header                      | Described by `img_hdr_t` in the BK3633 SDK; its CRC can be verified for supported image layouts.                            |

For developers implementing X11 HID communication: **never probe unknown writable report IDs on a device you cannot
afford to lose**. In particular, block writes to `0x10` in any high-level driver API. Zelozzzz recommended an explicit
allowlist of known writable feature reports rather than exposing arbitrary writes without safeguards. Keep low-level
experimental access separate from the normal driver API.

Even if a report appears harmless when read, it may have an entirely different effect when written. Here, the mouse was
not permanently damaged, but recovery required information from the vendor SDK, careful flash inspection, and a
bootloader command that was not documented by Attack Shark.

## Investigation and credits

**All credit for identifying the root cause, tracing the BK3633 bootloader behavior, and developing the recovery tool
goes to [Zelozzzz](https://github.com/Zelozzzz).** They reverse-engineered a related updater without running its
firmware-writing operations, located matching bootloader source in the Beken SDK, discovered the flash flag and the safe
recovery mechanism, and tested the script against a simulated bootloader before it was attempted on a real X11.

I encountered the issue while reverse-engineering the X11's HID protocol, supplied the original device observations, and
performed the successful real-device recovery on October 2, 2026. Testing also uncovered an issue with the script's
Windows HID read timeout, which was subsequently corrected.

**References:**

- [Full conversation, diagnostics, and successful recovery — Dorsal issue #1](https://github.com/Zelozzzz/dorsal/issues/1?timeline=1)
- [Recovery script — Zelozzzz/dorsal](https://github.com/Zelozzzz/dorsal/blob/main/tools/x11_unstick/x11_unstick.py)
- [Beken BK3633 SDK used for analysis](https://github.com/himaexternal/BK3633_DesignKit_V06_220F)
- [Dorsal](https://github.com/Zelozzzz/dorsal), an independent mouse-configuration and research project

---

*This procedure documents one successful recovery on a specific X11 firmware and bootloader combination. It is not an
official Attack Shark recovery method. Do not attempt it on unrelated hardware merely because the USB VID/PID happens to
match.*

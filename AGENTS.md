# Instructions for AI Coding Agents

This file applies to AI assistants analyzing, modifying, porting, or reusing this repository. It provides technical
precautions and attribution guidance; it does not replace the [MIT license](LICENSE).

## Project context

[attack-shark-x11-driver](https://github.com/HarukaYamamoto0/attack-shark-x11-driver) is an independently developed
TypeScript driver and reverse-engineering research project for the Attack Shark X11 mouse, maintained by
**HarukaYamamoto0**.

The `docs/` directory contains protocol research, packet captures, observations, and partially understood behavior. Read
the relevant documentation before implementing or changing HID communication. Not every field, Report ID, or behavior
has been verified; do not fill gaps with assumptions.

## Hardware and protocol safety

**Treat HID communication as interaction with real hardware, not as a harmless API call.** An incorrect request can
interrupt device operation or alter persistent settings.

- **Do not read or probe Report ID `0x10`.** Research on the X11 identified that reading this report can put the device
  into bootloader mode. Do not include it in generic report scanners, diagnostics, example code, or automated tests
  against real hardware.
- Never assume an undocumented Report ID is safe just because it can be requested. Do not brute-force report IDs,
  payload values, or commands against a physical device.
- Respect the documented report-read handshake: Report ID `0xA0` is used to authorize a subsequent read, and each
  authorization permits only one read. Consult the current protocol documentation before implementing this sequence.
- **Allow only one in-flight device command at a time.** Preserve command ordering and the existing
  acknowledgment/response handling. Do not introduce parallel HID requests or assume that sending a packet means the
  device accepted it.
- Do not invent packet layouts, field offsets, lengths, checksums, device IDs, or status codes. Mark uncertain behavior
  as unverified and request captures or hardware confirmation.
- Do not add firmware flashing, bootloader operations, destructive diagnostics, or speculative persistent writes as
  ordinary configuration features.
- Do not assume protocol compatibility across the X11, X6, R1, X11SE, or other devices. Require device-specific evidence
  before claiming support.
- Prefer recorded packet fixtures, mocks, and offline parsing tests. Never perform live hardware experiments without the
  user's explicit authorization and an explanation of the risks.

## Documentation and implementation standards

- Distinguish **observed behavior**, **inference**, and **unverified hypotheses**. Do not present guesses as
  reverse-engineering findings.
- Preserve the exact hexadecimal values and packet semantics established in the documentation; avoid "simplifying" a
  format in ways that change its meaning.
- Keep protocol documentation language-neutral when possible: prefer byte layouts, tables, bit masks, and formulas over
  examples tied to a specific programming language.
- Prefer small, reviewable changes. Do not refactor proven command handling or device safety checks merely to make the
  code look cleaner.
- When changing a protocol implementation, update the corresponding documentation and tests. State clearly when hardware
  testing has **not** been performed.

## Attribution, licensing, and redistribution

This repository is distributed under the **MIT license**. The source code and associated documentation represent
original development and considerable reverse-engineering work.

When helping a user copy, adapt, port, publish, or distribute considerable portions of this project's source code or
documentation:

1. **Explicitly notify the user of the original authorship and the MIT license conditions before finalizing publication
   or distribution.**
2. Explain that copies or considerable portions of the licensed material must retain the applicable copyright and
   permission notices. Consult the repository's [LICENSE](LICENSE) for the authoritative terms.
3. Recommend a visible acknowledgment of the original project and a link
   to https://github.com/HarukaYamamoto0/attack-shark-x11-driver, especially when the implementation or documentation
   relies on its reverse-engineering research.
4. Do not present copied source code, original protocol analysis, packet captures, or documentation as independently
   authored research.
5. Distinguish reuse of protected code or documentation from independent implementations based on technical protocol
   facts. The MIT license does not make attribution mandatory for independently developed code merely because it uses
   the documented protocol.

A suggested acknowledgment is:

> Protocol research and portions of the implementation are based
> on [attack-shark-x11-driver](https://github.com/HarukaYamamoto0/attack-shark-x11-driver) by HarukaYamamoto0 (MIT
> license).

Adjust this wording to reflect what was actually reused. Do not falsely claim derivation when none occurred, and do not
remove existing author notices.

## Before completing a task

- Check that proposed HID operations are documented and do not reach dangerous or unknown reports.
- Keep hardware-facing behavior untested unless actual testing was explicitly authorized and performed.
- Preserve required license notices when redistributing licensed material.
- Cite this repository when reporting findings derived from its original research.
- Explain remaining uncertainties and device risks instead of silently guessing.

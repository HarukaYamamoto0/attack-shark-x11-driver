# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Profile Management Protocol (`ProfileSettingsBuilder`)**:
  - Implemented `ProfileSettingsBuilder` (`src/protocols/ProfileSettingsBuilder.ts`) replacing the experimental `ChangeProfileBuilder` to manage active profile selection and maximum profile count (`ReportId.PROFILE_SETTING` / `0x0c`).
  - Added automatic inverted checksum calculations (`~currentProfile & 0xff`, `~maxProfileCount & 0xff`) and support for wired mode payload truncation (6 bytes vs 10 bytes).
  - Added `ChangeProfileBuilderOptions` interface for configuring profile parameters.
- **Core Driver Methods (`AttackSharkX11`)**:
  - Added `getProfileSettings(): Promise<ProfileSettingsBuilder>` to read active profile configuration via HID feature reports.
  - Added `setProfileSettings(options, timeoutMs?): Promise<CommandConfirmation>` to send profile configuration commands to the mouse.
  - Added `initializeProfile(config): Promise<void>` helper to provision a profile by synchronously applying profile settings, DPI stages, lighting settings, polling rates, and button mappings with timeout control.
- **Profile Event & Handling**:
  - Added `profileChanged` event to `AttackSharkX11Events`, emitted upon receiving unsolicited profile switch packets (`MessageTypes.PROFILE_CHANGED` / `0x80`).
  - Added `handleProfileChanged` (`src/handles/messages/handleProfileChanged.ts`) to parse device event bytes into strongly-typed `Profile` stages.
  - Added `handleProfileSettings` (`src/handles/handleProfileSettings.ts`) to validate packet length, verify checksums, and deserialize incoming profile data into `ProfileSettingsBuilder`.
- **Types & Enums**:
  - Added `Profile` enum (`Profile1 = 0x01` through `Profile5 = 0x05`) in `src/types.ts`.
  - Added `MAX_PROFILES` constant (`0x05`) defining the safe upper limit of profiles supported by the hardware.
  - Added `SlotButton` class (`src/structures/SlotButton.ts`) representing mapped actions, modifiers, and key usages.
  - Added `PROFILE_CYCLE` (`0x34`), `PROFILE_UP` (`0x35`), and `PROFILE_DOWN` (`0x36`) to `FirmwareAction`.
- **Utilities**:
  - Added `repeat(times, action)` (`src/utils/repeat.ts`) providing declarative, fail-fast loop execution with type and range assertions and isolated iteration scoping.
- **Documentation & Assets**:
  - Added `docs/protocols/profile-settings.md` detailing report structure, byte offsets, checksums, wired vs wireless handling, and macro profile-cycling caveats.
  - Added `docs/messages/profile-changed.md` explaining event code `0x80` payload layout.
  - Added `.github/assets/profile_changer.gif` showcasing mouse LED blink feedback during hardware profile switching.

### Changed
- **Button Mapping Protocol (`ButtonMappingBuilder`)**:
  - Refactored `ButtonMappingBuilder` to use `SlotButton` instances across all 18 slots (`Slot1` to `Slot18`) with predefined defaults (`defaultSlots`).
  - Migrated buffer backing to `Uint8Array` / `DataView` and integrated `repeat` for computing the 56-byte payload checksum.
  - Renamed checksum calculation method to `updateChecksum()` and standardized hex serialization with `.toHex()`.
- **Response Handler Updates**:
  - Updated `handleResponseButtonMapping` to instantiate `SlotButton` and invoke `updateChecksum()`.
- **Documentation Reorganization**:
  - Reorganized all protocol specifications into `docs/protocols/` (`button-mapping.md`, `custom-macro-protocol.md`, `dpi-protocol.md`, `polling-rate-protocol.md`, `report-id-reading.md`, `user-preferences-protocol.md`).
  - Updated `README.md` status list to mark `Profile Settings` and `Reading Settings` as supported.

### Deprecated
- `ProfileId` type alias in `src/types.ts` is now deprecated in favor of the `Profile` enum.

### Removed
- Removed preliminary `ChangeProfileBuilder` (`src/protocols/ChangeProfileBuilder.ts`).
- Removed obsolete sample packet captures and raw dump files from `docs/samples/` (`change-polling-rate.pcapng`, `reset-button.pcapng`, `dpi-change.txt`, `dpi-stage-mask.md`, `dpi.json`, `set-custom-macro.txt`, and `docs/internal-state-reset-protocol.md`).

import {AttackSharkX11} from "./core/AttackSharkX11.js";
import {LightMode, UserPreferencesBuilder} from "./protocols/UserPreferencesBuilder.js";
import {PollingRateBuilder, PollingRate} from "./protocols/PollingRateBuilder.js";
import DpiBuilder, {StageIndex} from "./protocols/DpiBuilder.js";
import {
    Buttons,
    FirmwareAction, KeyCode,
    MacroName,
    MacrosBuilder,
    macroTemplates, Modifiers
} from "./protocols/MacrosBuilder.js";

import {
    CustomMacroBuilder,
    CUSTOM_MACRO_BUTTONS,
    MacroSettings,
    MouseMacroEvent
} from "./protocols/CustomMacroBuilder.js";

export {
    AttackSharkX11,
    UserPreferencesBuilder,
    LightMode,
    PollingRateBuilder,
    PollingRate,
    DpiBuilder,
    MacroName, MacrosBuilder,
    Buttons,
    macroTemplates,
    FirmwareAction,
    Modifiers,
    KeyCode,
    CustomMacroBuilder,
    CUSTOM_MACRO_BUTTONS,
    MacroSettings,
    MouseMacroEvent,
    StageIndex
};

export * from "./types.js";

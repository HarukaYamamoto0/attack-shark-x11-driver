// noinspection ES6RedundantAwait,ES6UnusedImports

import {
    AttackSharkX11,
    KeyCode,
    CustomMacroBuilder,
    Buttons,
    MouseMacroEvent, MacroSettings
} from "./src/index.js";

const driver = new AttackSharkX11()

try {
    const customMacro = new CustomMacroBuilder()
        .setMacroButton(Buttons.EXTRA_BUTTON_5)
        .setPlayOptions(MacroSettings.THE_NUMBER_OF_TIME_TO_PLAY, 5)
        .addEvent(KeyCode.A, 10)
        .addEvent(KeyCode.A, 10, true)
        .addEvent(MouseMacroEvent.LEFT_CLICK, 20)
        .addEvent(MouseMacroEvent.LEFT_CLICK, 20, true)
        .addEvent(KeyCode.B, 5000)
        .addEvent(KeyCode.B, 10, true)

    await driver.setCustomMacro(customMacro)
} finally {
    driver.close()
}


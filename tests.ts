// noinspection ES6RedundantAwait,ES6UnusedImports

import {
    AttackSharkX11, Buttons,
    ConnectionMode,
    CustomMacroBuilder,
    KeyCode,
    MacroSettings
} from "./src/index.js";
import {addSpacingEvery2Chars} from "./src/utils/addSpacingEvery2Chars.js";
import {delay} from "./src/utils/delay.js";

const driver = new AttackSharkX11()

try {
    await driver.reset()
    await delay(500)

    const customMacro = new CustomMacroBuilder()
        .setMacroButton(Buttons.EXTRA_BUTTON_5)
        .setPlayOptions(MacroSettings.THE_NUMBER_OF_TIME_TO_PLAY,10)
        .addEvent(KeyCode.C, 10)
        .addEvent(KeyCode.C, 10, true)

    const [setMacroBuffer, secondPacket, thirdPacket, fourthPacket] = customMacro.build(ConnectionMode.Adapter)

    console.log(addSpacingEvery2Chars(setMacroBuffer!.toString("hex")))
    console.log(addSpacingEvery2Chars(secondPacket!.toString("hex")))
    console.log(addSpacingEvery2Chars(thirdPacket!.toString("hex")))
    console.log(addSpacingEvery2Chars(fourthPacket!.toString("hex")))

    await driver.setCustomMacro(customMacro)
} finally {
    driver.close()
}


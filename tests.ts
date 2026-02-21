import {AttackSharkX11, LightMode, PollingRateOptions} from "./src/index.js";
import {FirmwareAction, KeyCode, MacroTemplate, Modifiers} from "./src/protocols/MacrosBuilder.js";

const driver = new AttackSharkX11()

try {
    await driver.reset()
    // await driver.resetDpiSystem()
    // await driver.resetUserPreferences()
    // await driver.resetPollingRate()
    // await driver.resetMacro()

    // await driver.setPollingRate(PollingRateOptions.eSports)

    // await driver.setUserPreferences({
    //     sleepTime: 2,
    //     deepSleepTime: 10,
    //     keyResponse: 4,
    //     ledSpeed: 5,
    //     lightMode: LightMode.ColorBreathing,
    //     rgb: {
    //         r: 255,
    //         g: 0,
    //         b: 255
    //     }
    // })
    //
    // await driver.setMacro({
    //     left: MacroTemplate["global-left-click"],
    //     right: MacroTemplate["global-right-click"],
    //     middle: MacroTemplate["global-middle"],
    //     extra4: MacroTemplate["global-forward"],
    //     extra5: [FirmwareAction.KEYBOARD, Modifiers.ALT, KeyCode.TAB] as const,
    // })
} finally {
    driver.close()
}
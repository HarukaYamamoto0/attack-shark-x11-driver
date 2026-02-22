import {AttackSharkX11} from "./src/index.js";
import {MacroTemplate} from "./src/protocols/MacrosBuilder.js";

const driver = new AttackSharkX11()

try {
    await driver.setMacro({
        left: MacroTemplate["global-left-click"],
        right: MacroTemplate["global-right-click"],
        middle: MacroTemplate["global-middle"],
        extra4: MacroTemplate["global-backward"],
        extra5: MacroTemplate["shortcut-swap-window"],
    })
} finally {
    driver.close()
}
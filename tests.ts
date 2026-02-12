import {AttackSharkX11, LightMode} from "./src/index.js";

const driver = new AttackSharkX11()

try {
    const driver = new AttackSharkX11()
    await driver.setUserPreferences({
        lightMode: LightMode.Neon,
        ledSpeed: 5
    })
} finally {
    driver.close()
}
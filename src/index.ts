import {AttackSharkX11} from "./AttackSharkX11.js";

const driver = new AttackSharkX11()

await driver.setSleepAndDeepSleep(12.5, 38)

driver.close()
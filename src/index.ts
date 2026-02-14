import {AttackSharkX11} from "./AttackSharkX11.js";
import {PollingRateOptions} from "./protocols/PollingRateBuilder.js";

const driver = new AttackSharkX11()

await driver.setPollingRate(PollingRateOptions.eSports)

driver.close()
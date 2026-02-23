import {AttackSharkX11, ConnectionMode, DpiBuilder} from "./src/index.js";
import {StageIndex} from "./src/protocols/DpiBuilder.js";

const driver = new AttackSharkX11()

try {
    const builder = new DpiBuilder()
        .setDpiValue(StageIndex.FIRST, 800)   // stage1 = 800 DPI
        .setDpiValue(StageIndex.SECOND, 12000) // stage2 = 1600 DPI
        .setCurrentStage(StageIndex.SECOND)

    const buffer = builder.build(ConnectionMode.Wired);
    console.log(buffer.toString('hex'));

    await driver.setDpi(builder)
} finally {
    driver.close()
}
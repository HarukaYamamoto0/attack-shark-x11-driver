import {AttackSharkX11} from "./AttackSharkX11.js";

const driver = new AttackSharkX11()

const report = Buffer.alloc(52)

// report[0] = 0x04
// report[1] = 0x38
// report[2] = 0x01
// report[3] = 0x00 // angle snap, 0x00 para off e 0x01 para on
// report[4] = 0x00 // rippler control, 0x00 para off e 0x01 para on
// report[5] = 0x3F
// report[6] = 0x20
// report[7] = 0x20
// report[8] = 0x12 // indica o valor de DPI do stage 1, 0x12 é 800 e 0x01 é 50, vai de 50 até 22000 com step de 50
// report[9] = 0x25 // indica o valor de DPI do stage 2
// report[10] = 0x38 // indica o valor de DPI do stage 3
// report[11] = 0x4B // indica o valor de DPI do stage 4
// report[12] = 0x75 // indica o valor de DPI do stage 5
// report[13] = 0x81 // indica o valor de DPI do stage 6, que está em 22000
// report[14] = 0x00
// report[15] = 0x00
// report[16] = 0x00
//
// report[17] = 0x00
// report[18] = 0x00
// report[19] = 0x00
// report[20] = 0x00
// report[21] = 0x01
// report[22] = 0x00
// report[23] = 0x00
// report[24] = 0x02 // stage atual
// report[25] = 0xFF
// report[26] = 0x00
// report[27] = 0x00
// report[28] = 0x00
// report[29] = 0xFF
// report[30] = 0x00
// report[31] = 0x00
// report[32] = 0x00
//
// report[33] = 0xFF
// report[34] = 0xFF
// report[35] = 0xFF
// report[36] = 0x00
// report[37] = 0x00
// report[38] = 0xFF
// report[39] = 0xFF
// report[40] = 0xFF
// report[41] = 0x00
// report[42] = 0xFF
// report[43] = 0xFF
// report[44] = 0x40
// report[45] = 0x00
// report[46] = 0xFF
// report[47] = 0xFF
// report[48] = 0xFF
//
// report[49] = 0x02
// report[50] = 0x0F
// report[51] = 0x67 // checksum, mas não sei como calcular isto

// report[0] = 0x04
// report[1] = 0x38
// report[2] = 0x01
// report[3] = 0x00 // angle snap, 0x00 para off e 0x01 para on
// report[4] = 0x00 // rippler control, 0x00 para off e 0x01 para on
// report[5] = 0x3F
// report[6] = 0x01
// report[7] = 0x01
// report[8] = 0x81 // indica o valor de DPI do stage 1, 0x12 é 800 e 0x01 é 50, vai de 50 até 22000 com step de 50
// report[9] = 0x01 // indica o valor de DPI do stage 2
// report[10] = 0x01 // indica o valor de DPI do stage 3
// report[11] = 0x01 // indica o valor de DPI do stage 4
// report[12] = 0x01 // indica o valor de DPI do stage 5
// report[13] = 0x01 // indica o valor de DPI do stage 6, que está em 22000
// report[14] = 0x00
// report[15] = 0x00
// report[16] = 0x01
//
// report[17] = 0x00
// report[18] = 0x00
// report[19] = 0x00
// report[20] = 0x00
// report[21] = 0x00
// report[22] = 0x00
// report[23] = 0x00
// report[24] = 0x01 // stage atual
// report[25] = 0xFF
// report[26] = 0x00
// report[27] = 0x00
// report[28] = 0x00
// report[29] = 0xFF
// report[30] = 0x00
// report[31] = 0x00
// report[32] = 0x00
//
// report[33] = 0xFF
// report[34] = 0xFF
// report[35] = 0xFF
// report[36] = 0x00
// report[37] = 0x00
// report[38] = 0xFF
// report[39] = 0xFF
// report[40] = 0xFF
// report[41] = 0x00
// report[42] = 0xFF
// report[43] = 0xFF
// report[44] = 0x40
// report[45] = 0x00
// report[46] = 0xFF
// report[47] = 0xFF
// report[48] = 0xFF
//
// report[49] = 0x02
// report[50] = 0x0D
// report[51] = 0xFE // checksum, mas não sei como calcular isto
//
// await driver.commandTransfer(
//     report,
//     0x21,
//     0x09,
//     0x0304,
//     2
// );

await driver.setSleepAndDeepSleep(12.5, 38)

driver.close()
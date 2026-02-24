// noinspection SpellCheckingInspection

import {AttackSharkX11} from "./src/index.js";
import {addSpacingEvery2Chars} from "./src/utils/addSpacingEvery2Chars.js";

const driver = new AttackSharkX11()

enum Stages {
    First = 0x01,
    Second = 0x02,
    Third = 0x03,
    Fourth = 0x04,
    Fifth = 0x05,
    Sixth = 0x06,
}

try {
    const report = Buffer.alloc(56)

    report[0] = 0x04
    report[1] = 0x38
    report[2] = 0x01

    report[3] = 0x00 // angle snap
    report[4] = 0x01 // ripple control

    report[5] = 0x3F

    report[6] = 0x20
    report[7] = 0x20

    report[8] = 0x12 // stage 1 value
    report[9] = 0x25 // stage 2 value
    report[10] = 0x38 // stage 3 value
    report[11] = 0x4B // stage 4 value
    report[12] = 0x75 // stage 5 value
    report[13] = 0x81 // stage 6 value

    report[14] = 0x00
    report[15] = 0x00

    report[16] = 0x00 // high stage 1
    report[17] = 0x00 // high stage 2
    report[18] = 0x00 // high stage 3
    report[19] = 0x00 // high stage 4
    report[20] = 0x00 // high stage 5
    report[21] = 0x01 // high stage 6

    report[22] = 0x00
    report[23] = 0x00
    report[24] = Stages.First // stage index
    report[25] = 0xFF
    report[26] = 0x00
    report[27] = 0x00
    report[28] = 0x00
    report[29] = 0xFF
    report[30] = 0x00
    report[31] = 0x00

    report[32] = 0x00
    report[33] = 0xFF
    report[34] = 0xFF
    report[35] = 0xFF
    report[36] = 0x00
    report[37] = 0x00
    report[38] = 0xFF
    report[39] = 0xFF
    report[40] = 0xFF
    report[41] = 0x00
    report[42] = 0xFF
    report[43] = 0xFF
    report[44] = 0x40
    report[45] = 0x00
    report[46] = 0xFF
    report[47] = 0xFF

    report[48] = 0xFF
    report[49] = 0x02
    report[50] = 0x0F
    report[51] = 0x67 // checksum

    report[52] = 0x00 // padding wireless mode
    report[53] = 0x00 // padding wireless mode
    report[54] = 0x00 // padding wireless mode
    report[55] = 0x00 // padding wireless mode

    const stages = [7000, 13900, 4850, 8750, 9250, 9400]

    // calculates
    setAngleSnap(report, true)
    setRippleControl(report, false)
    setStages(report, stages)
    report[6] = computeStageMask(stages)
    report[7] = report[6] // mirror
    applyStageFlags(report, stages)
    report[50] = calculateChecksum2(report)
    report[51] = calculateChecksum(report)

    console.log(addSpacingEvery2Chars(report.toString("hex")))
} finally {
    driver.close()
}

function setAngleSnap(report: Uint8Array, active: boolean) {
    report[3] = active ? 0x01 : 0x00
}

function setRippleControl(report: Uint8Array, active: boolean) {
    report[4] = active ? 0x01 : 0x00
}

function setStages(report: Uint8Array, stages: number[]) {
    for (let i = 0; i < 6; i++) {
        report[16 + i] = encodeDpi(stages[i]!)
    }
}

function computeStageMask(stages: number[]): number {
    let mask = 0x00

    const bitValues = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20]

    for (let i = 0; i < 6; i++) {
        if (stages[i]! > 12000) {
            mask |= bitValues[i]!
        }
    }

    return mask
}

function applyStageFlags(report: Uint8Array, stages: number[]) {
    for (let i = 0; i < 6; i++) {
        report[16 + i] = stages[i]! > 10000 ? 0x01 : 0x00
    }
}

function calculateChecksum2(report: Uint8Array) {
    let checksum = 0x00
    for (let i = 3; i <= 49; i++) {
        checksum = (checksum + report[i]!) & 0xff
    }
    return checksum
}

function calculateChecksum(report: Uint8Array) {
    let checksum = 0x00
    for (let i = 3; i <= 49; i++) {
        checksum = (checksum + report[i]!) & 0xff
    }
    return checksum
}

function encodeDpi(dpi: number): number {
    return Math.floor(dpi / 50)
}


// quando o stage 1 está acima de 10000 o byte 16 é ativado com 0x01
// quando o stage 2 está acima de 10000 o byte 17 é ativado com 0x01
// quando o stage 3 está acima de 10000 o byte 18 é ativado com 0x01
// quando o stage 4 está acima de 10000 o byte 19 é ativado com 0x01
// quando o stage 5 está acima de 10000 o byte 20 é ativado com 0x01
// quando o stage 6 está acima de 10000 o byte 21 é ativado com 0x01
//
// quando o stage 1 está acima de 12000 o bytes 6 e 7 elevam para 0x01
// quando o stage 2 está acima de 12000 o bytes 6 e 7 elevam para 0x02
// quando o stage 3 está acima de 12000 o bytes 6 e 7 elevam para 0x04
// quando o stage 4 está acima de 12000 o bytes 6 e 7 elevam para 0x08
// quando o stage 5 está acima de 12000 o bytes 6 e 7 elevam para 0x10
// quando o stage 6 está acima de 12000 o bytes 6 e 7 elevam para 0x20
//
// quando o stage 6 está acima de 12000 e o stage 1 tambem o bytes 6 e 7 elevam para 0x21
// quando o stage 6 está acima de 12000 e o stage 2 tambem o bytes 6 e 7 elevam para 0x22
// quando o stage 6 está acima de 12000 e o stage 3 tambem o bytes 6 e 7 elevam para 0x24
// quando o stage 6 está acima de 12000 e o stage 4 tambem o bytes 6 e 7 elevam para 0x28
// quando o stage 6 está acima de 12000 e o stage 5 tambem o bytes 6 e 7 elevam para 0x30
//
// quando o stage 1 está acima de 12000 e o stage 2 tambem o bytes 6 e 7 elevam para 0x21
// quando o stage 1 está acima de 12000 e o stage 4 tambem o bytes 6 e 7 elevam para 0x22
// quando o stage 1 está acima de 12000 e o stage 5 tambem o bytes 6 e 7 elevam para 0x24
// quando o stage 1 está acima de 12000 e o stage 6 tambem o bytes 6 e 7 elevam para 0x28
//
// ou seja é uma soma dos valores ativos com valor minimo de 0x00 é com todos o stages ativos dá 0x3f
// se stage 2, 3 e 5 estiver acima de 12000 os bytes 6 e 7 elevam para 0x16 (0x02 + 0x04 + 0x10 = 0x16)
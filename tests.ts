import {AttackSharkX11} from "./src/index.js";

const driver = new AttackSharkX11()

enum Modifiers {
    CTRL = 0x01,
    SHIFT = 0x02,
    ALT = 0x04,
    WIN = 0x08
}

const mods =
    Modifiers.CTRL |
    Modifiers.SHIFT |
    Modifiers.ALT |
    Modifiers.WIN

export enum Letter {
    A = 0x04,
    B = 0x05,
    C = 0x06,
    D = 0x07,
    E = 0x08,
    F = 0x09,
    G = 0x0a,
    H = 0x0b,
    I = 0x0c,
    J = 0x0d,
    K = 0x0e,
    L = 0x0f,
    M = 0x10,
    N = 0x11,
    O = 0x12,
    P = 0x13,
    Q = 0x14,
    R = 0x15,
    S = 0x16,
    T = 0x17,
    U = 0x18,
    V = 0x19,
    W = 0x1a,
    X = 0x1b,
    Y = 0x1c,
    Z = 0x1d
}

// top line 1 == 0x1e
// top line 2 == 0x1f
// top line 3 == 0x20
// top line 4 == 0x21
// top line 5 == 0x22
// top line 6 == 0x23
// top line 7 == 0x24
// top line 8 == 0x25
// top line 9 == 0x26
// top line 0 == 0x27

// Numpad 1 == 0x59
// Numpad 2 == 0x5A
// Numpad 3 == 0x5B
// Numpad 4 == 0x5C
// Numpad 5 == 0x5D
// Numpad 6 == 0x5E
// Numpad 7 == 0x5F
// Numpad 8 == 0x60
// Numpad 9 == 0x61
// Numpad 0 == 0x62

// function
// F1 == 0x3a
// F2 == 0x3b
// F3 == 0x3c
// F4 == 0x3d
// F5 == 0x3e
// F6 == 0x3f
// F7 == 0x40
// F8 == 0x41
// F9 == 0x42
// F10 == 0x43
// F11 == 0x44
// F12 == 0x45
// prtScr == 0x46
// ScrollLock == 0x47
// Pause == 0x48
// Insert == 0x49

// * == 255

// BracketRight == 0x30
// Backslash == 0x31
// Backslash == 0x32
// Ç == 0x33
// Quote == 0x34
// Backquote == 0x35
// Comma == 0x36
// Period == 0x37
// Slash == 0x38
// CapsLock == 0x39

// Home == 0x4a
// PageUp == 0x4b
// Delete == 0x4c
// End == 0x4d
// PageDown == 0x4e
// ArrowRight == 0x4f

// ArrowLeft == 0X50
// ArrowDown == 0X51
// ArrowUp == 0X52
// NumLock == 0X53
// NumpadDivide == 0X54
// NumpadMultiply == 0X55
// NumpadSubtract == 0X56
// NumpadAdd == 0X57
// NumpadEnter == 0X58
// Numpad1 == 0X59

// Numpad2 == 0X5a
// Numpad3 == 0X5b
// Numpad4 == 0X5c
// Numpad5 == 0X5d
// Numpad6 == 0X5e
// Numpad7 == 0X5f

// Numpad8 == 0X60
// Numpad9 == 0X61
// Numpad0 == 0X62
// NumpadDecimal == 0X63
// IntlBackslash == 0X64
// ContextMenu == 0X65
// Power == 0X66
// NumpadEqual == 0X67
// F13 == 0X68
// F14 == 0X69

// F15 == 0X6a
// F16 == 0X6b
// F17 == 0X6c
// F18 == 0X6d
// F19 == 0X6e
// F20 == 0X6f
// F21 == 0X70
// F22 == 0X71
// F23 == 0X72
// F24 == 0X73

try {
    const report = Buffer.alloc(59);

    // 3 bytes: 0x11 == event (example: keyboard event, mouse, function key), 0x00 == ctrl/alt/shift/win, 0x00 == key

    report[0] = 0x08 // header
    report[1] = 0x3b // header
    report[2] = 0x01 // header

    report[3] = 0x02 // button 1
    report[4] = 0x00 // button 1
    report[5] = 0x00 // button 1

    report[6] = 0x03 // button 2
    report[7] = 0x00 // button 2
    report[8] = 0x00 // button 2

    report[9] = 0x04 // button 3
    report[10] = 0x00 // button 3
    report[11] = 0x00 // button 3

    report[12] = 0x01
    report[13] = 0x00
    report[14] = 0x00

    report[15] = 0x01
    report[16] = 0x00
    report[17] = 0x00

    report[18] = 0x0d
    report[19] = 0x00
    report[20] = 0x00

    report[21] = 0x06 // button 4
    report[22] = 0x00 // button 4
    report[23] = 0x00 // button 4

    // ControlLeft == 0xe0
    // ShiftLeft == 0x
    // AltLeft == 0x
    // Right ctrl == 0x
    // ShiftRight == 0x
    // AltRight == 0x

    // space == 0x2c
    // enter == 0x28
    // esc == 0x29
    // BACKSPACE == 0x2a
    // TAB == 0x2b
    // winLeft == 0xe3


    report[24] = 0x11 // button 5
    report[25] = 0x00 // button 5
    report[26] = 0xe1 // button 5

    report[27] = 0x01
    report[28] = 0x00
    report[29] = 0x00

    report[30] = 0x01
    report[31] = 0x00
    report[32] = 0x00

    report[33] = 0x01
    report[34] = 0x00
    report[35] = 0x00

    report[36] = 0x01
    report[37] = 0x00
    report[38] = 0x00

    report[39] = 0x01
    report[40] = 0x00
    report[41] = 0x00

    report[42] = 0x01
    report[43] = 0x00
    report[44] = 0x00

    report[45] = 0x01
    report[46] = 0x00
    report[47] = 0x00

    report[48] = 0x01
    report[49] = 0x00
    report[50] = 0x00

    report[51] = 0x09
    report[52] = 0x00
    report[53] = 0x00

    report[54] = 0x0a
    report[55] = 0x00
    report[56] = 0x00

    report[57] = 0x00
    report[58] = 0x3b // checksum

    let checksum = 0;
    for (let i = 2; i < report.length - 1; i++) {
        checksum += report[i]!
    }
    report[58] = (checksum & 0xFF) - 1;

    await driver.commandTransfer(
        report,
        0x21,
        0x09,
        0x0308,
        2
    );
} finally {
    driver.close()
}
import {AttackSharkX11} from "./src/index.js";

const driver = new AttackSharkX11()

try {
    // @ts-ignore
    const macros = {
        "global-left-click": [0x02, 0x00, 0x00],
        "global-right-click": [0x03, 0x00, 0x00],
        "global-middle": [0x04, 0x00, 0x00],
        "global-forward": [0x00, 0x00, 0x00],
        "global-backward": [0x00, 0x00, 0x00],
        "global-double-click": [0x00, 0x00, 0x00],
        "global-fire-button": [0x00, 0x00, 0x00],
        "global-easy-aim": [0x00, 0x00, 0x00],
        "global-scroll-up": [0x00, 0x00, 0x00],
        "global-scroll-down": [0x00, 0x00, 0x00],
        "global-disable-button": [0x00, 0x00, 0x00],
        "global-dpi-cycle": [0x00, 0x00, 0x00],
        "global-dpi-+": [0x00, 0x00, 0x00],
        "global-dpi--": [0x00, 0x00, 0x00],

        // Multimedia
        "multimedia-media-player": [0x00, 0x00, 0x00],
        "multimedia-play-pause": [0x00, 0x00, 0x00],
        "multimedia-stop-music": [0x00, 0x00, 0x00],
        "multimedia-previous-track": [0x00, 0x00, 0x00],
        "multimedia-next-track": [0x00, 0x00, 0x00],
        "multimedia-volume-+": [0x00, 0x00, 0x00],
        "multimedia-volume--": [0x00, 0x00, 0x00],
        "multimedia-mute": [0x00, 0x00, 0x00],

        // Browser
        "browser-home": [0x00, 0x00, 0x00],
        "browser-favorites": [0x00, 0x00, 0x00],
        "browser-forward": [0x00, 0x00, 0x00],
        "browser-backward": [0x00, 0x00, 0x00],
        "browser-stop": [0x00, 0x00, 0x00],
        "browser-refresh": [0x00, 0x00, 0x00],
        "browser-cut": [0x00, 0x00, 0x00],
        "browser-search": [0x00, 0x00, 0x00],
        "browser-email": [0x00, 0x00, 0x00],
        "browser-calculator": [0x00, 0x00, 0x00],
        "browser-my-computer": [0x00, 0x00, 0x00],

        "shortcut-cut": [0x00, 0x00, 0x00],
        "shortcut-copy": [0x00, 0x00, 0x00],
        "shortcut-paste": [0x00, 0x00, 0x00],
        "shortcut-open": [0x00, 0x00, 0x00],
        "shortcut-save": [0x00, 0x00, 0x00],
        "shortcut-find": [0x00, 0x00, 0x00],
        "shortcut-repo": [0x00, 0x00, 0x00],
        "shortcut-select-all": [0x00, 0x00, 0x00],
        "shortcut-print": [0x00, 0x00, 0x00],
        "shortcut-close-window": [0x00, 0x00, 0x00],
        "shortcut-swap-window": [0x00, 0x00, 0x00],
        "shortcut-rin-command": [0x00, 0x00, 0x00],
        "shortcut-lock-pc": [0x00, 0x00, 0x00],
        "shortcut-screen-capture": [0x00, 0x00, 0x00],
    }

    const report = Buffer.alloc(59)

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

    report[21] = 0x05 // button 4
    report[22] = 0x00 // button 4
    report[23] = 0x00 // button 4

    report[24] = 0x06 // button 5
    report[25] = 0x00 // button 5
    report[26] = 0x00 // button 5

    report[27] = 0x05
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
    report[58] = 0x3b

    const result = await driver.commandTransfer(
        report,
        0x21,
        9,
        0x0308,
        2
    );

    console.log(result)
} finally {
    driver.close()
}
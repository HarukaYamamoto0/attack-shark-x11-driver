import type {BaseProtocolBuilder} from "../core/BaseProtocolBuilder.js";
import {Button, type ConnectionMode} from "../types.js";

export type MacroTuple = readonly [
    FirmwareAction,
    Modifiers,
        KeyCode | number
];

export enum Modifiers {
    NONE = 0x00,
    CTRL = 0x01,
    SHIFT = 0x02,
    ALT = 0x04,
    WIN = 0x08
}

// noinspection JSUnusedGlobalSymbols
export enum KeyCode {
    NONE = 0x00,
    ONLY_USED_BY_EASY_AIM = 0x03, // used by easy-aim

    // TODO: Check for missing keys such as ALT.

    // Letters
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
    Z = 0x1d,

    // Number row
    DIGIT_1 = 0x1e,
    DIGIT_2 = 0x1f,
    DIGIT_3 = 0x20,
    DIGIT_4 = 0x21,
    DIGIT_5 = 0x22,
    DIGIT_6 = 0x23,
    DIGIT_7 = 0x24,
    DIGIT_8 = 0x25,
    DIGIT_9 = 0x26,
    DIGIT_0 = 0x27,

    // Controls
    ENTER = 0x28,
    ESC = 0x29,
    BACKSPACE = 0x2a,
    TAB = 0x2b,
    LShift = 0xE1,
    RShift = 0xE5,
    LAlt = 0xE2,
    RAlt = 0xE6,
    LCrtl = 0xE0,
    RCrtl = 0xE4,
    LWin = 0xE3,
    RWin = 0xE7,
    SPACE = 0x2c,

    // Symbols
    BRACKET_RIGHT = 0x30,
    BACKSLASH = 0x31,
    NON_US_HASH = 0x32,
    SEMICOLON = 0x33, // Ç in ABNT2
    QUOTE = 0x34,
    BACKQUOTE = 0x35,
    COMMA = 0x36,
    PERIOD = 0x37,
    SLASH = 0x38,
    CAPS_LOCK = 0x39,

    // Function keys
    F1 = 0x3a,
    F2 = 0x3b,
    F3 = 0x3c,
    F4 = 0x3d,
    F5 = 0x3e,
    F6 = 0x3f,
    F7 = 0x40,
    F8 = 0x41,
    F9 = 0x42,
    F10 = 0x43,
    F11 = 0x44,
    F12 = 0x45,

    PRINT_SCREEN = 0x46,
    SCROLL_LOCK = 0x47,
    PAUSE = 0x48,
    INSERT = 0x49,

    // Navigation
    HOME = 0x4a,
    PAGE_UP = 0x4b,
    DELETE = 0x4c,
    END = 0x4d,
    PAGE_DOWN = 0x4e,
    ARROW_RIGHT = 0x4f,
    ARROW_LEFT = 0x50,
    ARROW_DOWN = 0x51,
    ARROW_UP = 0x52,

    // Numpad
    NUM_LOCK = 0x53,
    NUMPAD_DIVIDE = 0x54,
    NUMPAD_MULTIPLY = 0x55,
    NUMPAD_SUBTRACT = 0x56,
    NUMPAD_ADD = 0x57,
    NUMPAD_ENTER = 0x58,
    NUMPAD_1 = 0x59,
    NUMPAD_2 = 0x5a,
    NUMPAD_3 = 0x5b,
    NUMPAD_4 = 0x5c,
    NUMPAD_5 = 0x5d,
    NUMPAD_6 = 0x5e,
    NUMPAD_7 = 0x5f,
    NUMPAD_8 = 0x60,
    NUMPAD_9 = 0x61,
    NUMPAD_0 = 0x62,
    NUMPAD_DECIMAL = 0x63,

    // Intl / extended
    INTL_BACKSLASH = 0x64,
    CONTEXT_MENU = 0x65,
    POWER = 0x66,
    NUMPAD_EQUAL = 0x67,

    F13 = 0x68,
    F14 = 0x69,
    F15 = 0x6a,
    F16 = 0x6b,
    F17 = 0x6c,
    F18 = 0x6d,
    F19 = 0x6e,
    F20 = 0x6f,
    F21 = 0x70,
    F22 = 0x71,
    F23 = 0x72,
    F24 = 0x73,
}

export enum MacroName {
    // Global
    GLOBAL_DISABLE_BUTTON = "global-disable-button",
    GLOBAL_LEFT_CLICK = "global-left-click",
    GLOBAL_RIGHT_CLICK = "global-right-click",
    GLOBAL_MIDDLE = "global-middle",
    GLOBAL_BACKWARD = "global-backward",
    GLOBAL_FORWARD = "global-forward",
    GLOBAL_DOUBLE_CLICK = "global-double-click",
    GLOBAL_FIRE_BUTTON = "global-fire-button",
    GLOBAL_SCROLL_UP = "global-scroll-up",
    GLOBAL_SCROLL_DOWN = "global-scroll-down",
    GLOBAL_EASY_AIM = "global-easy-aim",
    GLOBAL_DPI_CYCLE = "global-dpi-cycle",
    GLOBAL_DPI_PLUS = "global-dpi-+",
    GLOBAL_DPI_MINUS = "global-dpi--",

    // Multimedia
    MULTIMEDIA_MEDIA_PLAYER = "multimedia-media-player",
    MULTIMEDIA_PLAY_PAUSE = "multimedia-play-pause",
    MULTIMEDIA_STOP_MUSIC = "multimedia-stop-music",
    MULTIMEDIA_PREVIOUS_TRACK = "multimedia-previous-track",
    MULTIMEDIA_NEXT_TRACK = "multimedia-next-track",
    MULTIMEDIA_VOLUME_PLUS = "multimedia-volume-+",
    MULTIMEDIA_VOLUME_MINUS = "multimedia-volume--",
    MULTIMEDIA_MUTE = "multimedia-mute",

    // Browser
    BROWSER_HOME = "browser-home",
    BROWSER_FAVORITES = "browser-favorites",
    BROWSER_FORWARD = "browser-forward",
    BROWSER_BACKWARD = "browser-backward",
    BROWSER_STOP = "browser-stop",
    BROWSER_REFRESH = "browser-refresh",
    BROWSER_SEARCH = "browser-search",
    BROWSER_EMAIL = "browser-email",
    BROWSER_CALCULATOR = "browser-calculator",
    BROWSER_MY_COMPUTER = "browser-my-computer",

    // Shortcuts
    SHORTCUT_CUT = "shortcut-cut",
    SHORTCUT_COPY = "shortcut-copy",
    SHORTCUT_PASTE = "shortcut-paste",
    SHORTCUT_OPEN = "shortcut-open",
    SHORTCUT_SAVE = "shortcut-save",
    SHORTCUT_FIND = "shortcut-find",
    SHORTCUT_REDO = "shortcut-redo",
    SHORTCUT_SELECT_ALL = "shortcut-select-all",
    SHORTCUT_PRINT = "shortcut-print",
    SHORTCUT_CLOSE_WINDOW = "shortcut-close-window",
    SHORTCUT_SWAP_WINDOW = "shortcut-swap-window",
    SHORTCUT_SHOW_DESKTOP = "shortcut-show-desktop",
    SHORTCUT_RUN_COMMAND = "shortcut-run-command",
    SHORTCUT_LOCK_PC = "shortcut-lock-pc",
    SHORTCUT_SCREEN_CAPTURE = "shortcut-screen-capture",

    CUSTOM_MACRO_LEFT_BUTTON = "custom-macro-left-button",
    CUSTOM_MACRO_RIGHT_BUTTON = "custom-macro-right-button",
    CUSTOM_MACRO_MIDDLE_BUTTON = "custom-macro-middle-button",
    CUSTOM_MACRO_EXTRA_BUTTON_4 = "custom-macro-extra-button_4",
    CUSTOM_MACRO_EXTRA_BUTTON_5 = "custom-macro-extra-button_5",
}

export enum FirmwareAction {
    // Mouse
    DISABLE_BUTTON = 0x01,
    LEFT_CLICK = 0x02,
    RIGHT_CLICK = 0x03,
    MIDDLE_CLICK = 0x04,
    BACKWARD = 0x05,
    FORWARD = 0x06,
    DOUBLE_CLICK = 0x07,
    FIRE = 0x08,
    SCROLL_UP = 0x09,
    EASY_AIM = 0x10,
    SCROLL_DOWN = 0x0A,
    GLOBAL_DPI_CYCLE = 0x0D,
    GLOBAL_DPI_PLUS = 0x0E,
    GLOBAL_DPI_MINUS = 0x0F,

    // Keyboard
    KEYBOARD = 0x11,
    CUSTOM_MACRO = 0X12,

    // Multimedia
    MEDIA_PLAYER = 0x15,
    PREVIOUS_TRACK = 0x16,
    NEXT_TRACK = 0x17,
    PLAY_PAUSE = 0x18,
    STOP = 0x19,
    MUTE = 0x1A,
    VOL_PLUS = 0x1B,
    VOL_MINUS = 0x1C,

    CALCULATOR = 0x1D,
    EMAIL = 0x1E,
    BROWSER_FORWARD = 0x20,
    BROWSER_BACKWARD = 0x21,
    BROWSER_STOP = 0x22,
    MY_COMPUTER = 0x23,
    BROWSER_REFRESH = 0x24,
    BROWSER_HOME = 0x25,
    BROWSER_SEARCH = 0x26,
}

export type MacroTemplate = Record<MacroName, MacroTuple>

export const macroTemplates: MacroTemplate = {
    [MacroName.GLOBAL_DISABLE_BUTTON]: [FirmwareAction.DISABLE_BUTTON, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_LEFT_CLICK]: [FirmwareAction.LEFT_CLICK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_RIGHT_CLICK]: [FirmwareAction.RIGHT_CLICK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_MIDDLE]: [FirmwareAction.MIDDLE_CLICK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_BACKWARD]: [FirmwareAction.BACKWARD, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_FORWARD]: [FirmwareAction.FORWARD, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_DOUBLE_CLICK]: [FirmwareAction.DOUBLE_CLICK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_FIRE_BUTTON]: [FirmwareAction.FIRE, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_SCROLL_UP]: [FirmwareAction.SCROLL_UP, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_EASY_AIM]: [FirmwareAction.EASY_AIM, Modifiers.NONE, KeyCode.ONLY_USED_BY_EASY_AIM],
    [MacroName.GLOBAL_SCROLL_DOWN]: [FirmwareAction.SCROLL_DOWN, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_DPI_CYCLE]: [FirmwareAction.GLOBAL_DPI_CYCLE, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_DPI_PLUS]: [FirmwareAction.GLOBAL_DPI_PLUS, Modifiers.NONE, KeyCode.NONE],
    [MacroName.GLOBAL_DPI_MINUS]: [FirmwareAction.GLOBAL_DPI_MINUS, Modifiers.NONE, KeyCode.NONE],

    // Multimedia
    [MacroName.MULTIMEDIA_MEDIA_PLAYER]: [FirmwareAction.MEDIA_PLAYER, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_PLAY_PAUSE]: [FirmwareAction.PLAY_PAUSE, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_STOP_MUSIC]: [FirmwareAction.STOP, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_PREVIOUS_TRACK]: [FirmwareAction.PREVIOUS_TRACK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_NEXT_TRACK]: [FirmwareAction.NEXT_TRACK, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_VOLUME_PLUS]: [FirmwareAction.VOL_PLUS, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_VOLUME_MINUS]: [FirmwareAction.VOL_MINUS, Modifiers.NONE, KeyCode.NONE],
    [MacroName.MULTIMEDIA_MUTE]: [FirmwareAction.MUTE, Modifiers.NONE, KeyCode.NONE],

    // Browser
    [MacroName.BROWSER_HOME]: [FirmwareAction.BROWSER_HOME, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_FAVORITES]: [FirmwareAction.KEYBOARD, Modifiers.CTRL | Modifiers.SHIFT, KeyCode.O],
    [MacroName.BROWSER_FORWARD]: [FirmwareAction.BROWSER_FORWARD, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_BACKWARD]: [FirmwareAction.BROWSER_BACKWARD, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_STOP]: [FirmwareAction.BROWSER_STOP, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_REFRESH]: [FirmwareAction.BROWSER_REFRESH, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_SEARCH]: [FirmwareAction.BROWSER_SEARCH, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_EMAIL]: [FirmwareAction.EMAIL, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_CALCULATOR]: [FirmwareAction.CALCULATOR, Modifiers.NONE, KeyCode.NONE],
    [MacroName.BROWSER_MY_COMPUTER]: [FirmwareAction.MY_COMPUTER, Modifiers.NONE, KeyCode.NONE],

    // Shortcuts
    [MacroName.SHORTCUT_CUT]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.X],
    [MacroName.SHORTCUT_COPY]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.C],
    [MacroName.SHORTCUT_PASTE]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.V],
    [MacroName.SHORTCUT_OPEN]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.O],
    [MacroName.SHORTCUT_SAVE]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.S],
    [MacroName.SHORTCUT_FIND]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.F],
    [MacroName.SHORTCUT_REDO]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.Y],
    [MacroName.SHORTCUT_SELECT_ALL]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.A],
    [MacroName.SHORTCUT_PRINT]: [FirmwareAction.KEYBOARD, Modifiers.CTRL, KeyCode.P],
    [MacroName.SHORTCUT_CLOSE_WINDOW]: [FirmwareAction.KEYBOARD, Modifiers.ALT, KeyCode.F4],
    [MacroName.SHORTCUT_SWAP_WINDOW]: [FirmwareAction.KEYBOARD, Modifiers.ALT, KeyCode.TAB],
    [MacroName.SHORTCUT_SHOW_DESKTOP]: [FirmwareAction.KEYBOARD, Modifiers.WIN, KeyCode.D],
    [MacroName.SHORTCUT_RUN_COMMAND]: [FirmwareAction.KEYBOARD, Modifiers.WIN, KeyCode.R],
    [MacroName.SHORTCUT_LOCK_PC]: [FirmwareAction.KEYBOARD, Modifiers.WIN, KeyCode.L],
    [MacroName.SHORTCUT_SCREEN_CAPTURE]: [FirmwareAction.KEYBOARD, Modifiers.WIN | Modifiers.SHIFT, KeyCode.S],

    [MacroName.CUSTOM_MACRO_LEFT_BUTTON]: [FirmwareAction.CUSTOM_MACRO, Modifiers.NONE, 0x01],
    [MacroName.CUSTOM_MACRO_RIGHT_BUTTON]: [FirmwareAction.CUSTOM_MACRO, Modifiers.NONE, 0x02],
    [MacroName.CUSTOM_MACRO_MIDDLE_BUTTON]: [FirmwareAction.CUSTOM_MACRO, Modifiers.NONE, 0x03],
    [MacroName.CUSTOM_MACRO_EXTRA_BUTTON_4]: [FirmwareAction.CUSTOM_MACRO, Modifiers.NONE, 0x07],
    [MacroName.CUSTOM_MACRO_EXTRA_BUTTON_5]: [FirmwareAction.CUSTOM_MACRO, Modifiers.NONE, 0x08],
} satisfies Record<MacroName, MacroTuple>;

enum InternalButtons {
    LEFT = 0,
    RIGHT = 1,
    MIDDLE = 2,
    FORWARD = 3,
    BACKWARD = 4,
    DPI = 6,
    SCROLL_UP = 16,
    SCROLL_DOWN = 17,
}

const internalButtonsMap: Record<Button, InternalButtons> = {
    [Button.LEFT]: InternalButtons.LEFT,
    [Button.RIGHT]: InternalButtons.RIGHT,
    [Button.MIDDLE]: InternalButtons.MIDDLE,
    [Button.FORWARD]: InternalButtons.FORWARD,
    [Button.BACKWARD]: InternalButtons.BACKWARD,
    [Button.DPI]: InternalButtons.DPI,
    [Button.SCROLL_UP]: InternalButtons.SCROLL_UP,
    [Button.SCROLL_DOWN]: InternalButtons.SCROLL_DOWN
}

const BUTTON_OFFSET: Record<InternalButtons, number> = {
    [InternalButtons.LEFT]: 3,
    [InternalButtons.RIGHT]: 6,
    [InternalButtons.MIDDLE]: 9,
    [InternalButtons.FORWARD]: 21,
    [InternalButtons.BACKWARD]: 24,
    [InternalButtons.DPI]: 18,
    [InternalButtons.SCROLL_UP]: 51,
    [InternalButtons.SCROLL_DOWN]: 54,
};

export interface MacroBuilderOptions {
    left?: MacroTuple,
    right?: MacroTuple,
    middle?: MacroTuple,
    forward?: MacroTuple,
    backward?: MacroTuple,
    dpi?: MacroTuple,
    scrollUp?: MacroTuple,
    scrollDown?: MacroTuple
}

/**
 * Builder for configuring Mouse Button Macros and reassignments (Report 0x0308).
 * This builder allows remapping buttons to mouse clicks, keyboard keys, multimedia controls, and more.
 */
export class MacrosBuilder implements BaseProtocolBuilder {
    public static readonly BM_REQUEST_TYPE = 0x21;
    public static readonly B_REQUEST = 0x09;
    public static readonly W_VALUE = 0x0308;
    public static readonly W_INDEX = 2;

    public static readonly DEFAULT_MACROS: MacroBuilderOptions = {
        left: macroTemplates[MacroName.GLOBAL_LEFT_CLICK],
        right: macroTemplates[MacroName.GLOBAL_RIGHT_CLICK],
        middle: macroTemplates[MacroName.GLOBAL_MIDDLE],
        forward: macroTemplates[MacroName.GLOBAL_FORWARD],
        backward: macroTemplates[MacroName.GLOBAL_BACKWARD],
    };

    readonly buffer: Buffer;
    public readonly bmRequestType: number = MacrosBuilder.BM_REQUEST_TYPE;
    public readonly bRequest: number = MacrosBuilder.B_REQUEST;
    public readonly wValue: number = MacrosBuilder.W_VALUE;
    public readonly wIndex: number = MacrosBuilder.W_INDEX;

    // noinspection FunctionTooLongJS
    /**
     * Initializes a new MacrosBuilder instance with default button mappings.
     *
     * @param options Partial macro configurations to override defaults.
     */
    constructor(options?: MacroBuilderOptions) {
        this.buffer = Buffer.alloc(59);

        // Header: Report ID 0x08, Length 0x3b (59), Protocol version 0x01
        this.buffer[0] = 0x08;
        this.buffer[1] = 0x3b;
        this.buffer[2] = 0x01;

        // Initialize all 18 button slots (3 bytes each) with [0x01, 0x00, 0x00]
        // This is the "Inactive" or "Disabled" default state for most slots.
        for (let i = 3; i <= 54; i += 3) {
            this.buffer[i] = 0x01;
            this.buffer[i + 1] = 0x00;
            this.buffer[i + 2] = 0x00;
        }

        // Default internal assignments
        this.buffer[18] = 0x0d; // Slot 6 (DPI Cycle)
        this.buffer[51] = 0x09; // Slot 17 (Scroll Up)
        this.buffer[54] = 0x0a; // Slot 18 (Scroll Down)

        const config = {...MacrosBuilder.DEFAULT_MACROS, ...options};

        if (config.left !== undefined) this.setMacro(Button.LEFT, config.left);
        if (config.right !== undefined) this.setMacro(Button.RIGHT, config.right);
        if (config.middle !== undefined) this.setMacro(Button.MIDDLE, config.middle);
        if (config.forward !== undefined) this.setMacro(Button.FORWARD, config.forward);
        if (config.backward !== undefined) this.setMacro(Button.BACKWARD, config.backward);
        if (config.dpi !== undefined) this.setMacro(Button.DPI, config.dpi);
        if (config.scrollUp !== undefined) this.setMacro(Button.SCROLL_UP, config.scrollUp);
        if (config.scrollDown !== undefined) this.setMacro(Button.SCROLL_DOWN, config.scrollDown);
    }

    /**
     * Assigns a macro action to a specific mouse button.
     *
     * @param button The button index or identifier.
     * @param macro A tuple containing [Action, Modifier, KeyCode/Value].
     * @return {this} The current instance for method chaining.
     */
    setMacro(button: Button, macro: MacroTuple): this {
        const [
            firmwareAction = FirmwareAction.DISABLE_BUTTON,
            modifier = Modifiers.NONE,
            keyCode = KeyCode.NONE
        ] = macro;

        const internalButton = internalButtonsMap[button]

        const offset = BUTTON_OFFSET[internalButton];
        if (offset === undefined) {
            throw new Error(`Invalid button identifier: ${button}`);
        }

        this.buffer[offset] = firmwareAction;
        this.buffer[offset + 1] = modifier;
        this.buffer[offset + 2] = keyCode;

        return this;
    }

    /**
     * Calculates the checksum for the macro configuration buffer.
     * The checksum is the sum of bytes from index 2 to 57, minus 1, masked to 8 bits.
     *
     * @return {number} The calculated 8-bit checksum.
     */
    calculateChecksum(): number {
        let sum = 0;

        for (let i = 2; i < this.buffer.length - 1; i++) {
            sum = (sum + this.buffer[i]!) & 0xff;
        }

        return (sum - 1) & 0xff;
    }

    /**
     * Finalizes the buffer by calculating the checksum.
     *
     * @param _mode Connection mode (currently ignored as macros are identical).
     * @return {Buffer} The built macro configuration buffer.
     */
    build(_mode: ConnectionMode): Buffer {
        this.buffer[58] = this.calculateChecksum();
        return this.buffer;
    }

    toString(): string {
        return this.buffer.toString("hex");
    }

    compareWithHexString(value: string): boolean {
        return this.toString() == value
    }
}

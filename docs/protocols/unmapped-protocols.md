# Unmapped Protocols

| Report ID | Payload |            Description |
|----------:|--------:|-----------------------:|
|    `0x04` |    `51` |                    DPI |
|    `0x05` |    `12` |       User Preferences |
|    `0x06` |     `8` |           Polling Rate |
|    `0x07` |     `7` |            Wakeup Mode |
|    `0x08` |    `58` |         Button Mapping |
|    `0x09` |    `63` |                  Macro |
|    `0x0A` |     `7` |           Read Profile |
|    `0x0B` |     `7` |     Get Version Number |
|    `0x10` |     `7` | Bootloader / recovery control |
|    `0xA0` |     `7` |     Reading Report IDs |
|    `0x22` |   `131` |                Unknown |
|    `0x24` |     `7` |                Unknown |
|    `0x25` |    `12` |                Unknown |
|    `0x26` |     `8` |                Unknown |
|    `0x27` |     `7` |                Unknown |
|    `0x28` |   `131` |                Unknown |
|    `0x29` |   `128` |                Unknown |
|    `0x2A` |   `130` |                Unknown |
|    `0x2B` |     `7` |                Unknown |
|    `0x2C` |     `3` |                Unknown |
|    `0x2D` |   `102` |                Unknown |
|    `0x2E` |     `4` |                Unknown |

## Report Id `0x2c`

### Response

```shell
2c 64 01
```

## Report Id `0x10` — Bootloader / recovery control

Observed behavior:
Using this report caused the firmware to store the bootloader persistence
flag 0x1234 at flash address 0x7D000 and restart into the Beken USB
bootloader (A745:0033).

The normal application firmware remained intact.

# Power Manager
Ele é dois slider um para o tempo de sleep e outro para o tempo de deep sleep.

O tempo de sleep vai de 0.50 min a 30 min e seu step alterna entre +10s e +50s.
O tempo de deep sleep vai de 1 min a 60 min e seu step é de 1 min.

na hora do envio ele envia os valores dos dois slider o slider 1 fica em 0x09 e o slider 2 em 0x01.

## Setup data

```txt
Setup Data
    bmRequestType: 0x21
    bRequest: SET_REPORT (0x09)
    wValue: 0x0305
    wIndex: 2
    wLength: 13
    Data Fragment: 050f0100330800ff000104013f
```

## Sleep Time 0.5 min  (default value)

Request

```txt
0000   05 0f 01 00 03 a8 00 ff 00 01 04 01 af
```

Response:

```txt
USB URB
    [Source: 3.4.0]
    [Destination: host]
    USBPcap pseudoheader length: 28
    IRP ID: 0xffffcb8bc24eb920
    IRP USBD_STATUS: USBD_STATUS_SUCCESS (0x00000000)
    URB Function: URB_FUNCTION_CONTROL_TRANSFER (0x0008)
    IRP information: 0x01, Direction: PDO -> FDO
        0000 000. = Reserved: 0x00
        .... ...1 = Direction: PDO -> FDO (0x1)
    URB bus id: 3
    Device address: 4
    Endpoint: 0x00, Direction: OUT
        0... .... = Direction: OUT (0)
        .... 0000 = Endpoint number: 0
    URB transfer type: URB_CONTROL (0x02)
    Packet Data Length: 0
    [Request in: 317669]
    [Time from request: 341.000 microseconds]
    Control transfer stage: Complete (3)
    [bInterfaceClass: HID (0x03)]
```

## Sleep Time 1 min
Request:

```txt
0000   05 0f 01 00 03 a8 00 ff 00 02 04 01 b0
```

## Sleep Time 1.50 min

Request:

```txt
0000   05 0f 01 00 03 a8 00 ff 00 03 04 01 b1
```

## Sleep Time 2 min

Request:

```txt
0000   05 0f 01 00 03 a8 00 ff 00 04 04 01 b2
```

## Sleep Time 30 min

Request:

```txt
0000   05 0f 01 00 03 a8 00 ff 00 3c 04 01 ea
```

## Deep Sleep Time 1 min

Request:

```txt
0000   05 0f 01 00 03 18 00 ff 00 01 04 01 1f
```

## Deep Sleep Time 1 min

Request:

```txt
0000   05 0F 01 00 03 18 00 FF 00 01 04 01 1F
```

## Deep Sleep Time 2 min

Request:

```txt
0000   05 0f 01 00 03 28 00 ff 00 01 04 01 2f
```

## Deep Sleep Time 3 min

Request:

```txt
0000   05 0f 01 00 03 38 00 ff 00 01 04 01 3f
```

## Deep Sleep Time 4 min

Request:

```txt
0000   05 0f 01 00 03 48 00 ff 00 01 04 01 4f
```

## Deep Sleep Time 16 min

Request:

```txt
0000   05 0f 01 00 13 08 00 ff 00 01 04 01 1f
```

## Deep Sleep Time 32 min

Request:

```txt
0000   05 0f 01 00 23 08 00 ff 00 01 04 01 2f
```

## Deep Sleep Time 48 min

Request:

```txt
0000   05 0f 01 00 33 08 00 ff 00 01 04 01 3f
```

## Deep Sleep Time 60 min

Request:

```txt
0000   05 0f 01 00 33 c8 00 ff 00 01 04 01 ff
```

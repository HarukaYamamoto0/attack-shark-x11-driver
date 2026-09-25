# Reading Report IDs

> For simplicity, I will refer to Report IDs as *commands* throughout this document.

Reading a command is straightforward, but it requires two steps. First, you must “request permission” to read. Only then can you read the command itself. If you attempt to read it without requesting permission, you will receive bytes that appear to be random.

To request permission, send a Feature `SET_REPORT` using command `0xA0` with the following bytes:

```typescript
import AttackSharkX11 from './AttackSharkX11';

const driver = new AttackSharkX11();
await driver.open();

const buffer = new Uint8Array(8);

buffer[0] = 0xA0;
buffer[1] = 0x04; // Report ID
buffer[2] = 0x38; // Response length
buffer[3] = 0x00; // Unknown
buffer[4] = 0x01; // Parameter
buffer[5] = 0x00; // Unknown
buffer[6] = 0x00; // Unknown
buffer[7] = 0x00; // Unknown

await driver.transport?.sendFeatureReport(buffer);
```

Byte **2** specifies the length of the response you expect to receive. The length for each command is defined in the `ReportLengthRead` enum in [types.ts](../src/types.ts). If you provide a value other than the expected length, the device rejects the request.

Byte **4** is a parameter. In most cases, it is the profile ID, which lets you request data for a specific profile. For a macro command, however, this parameter is the ID of the macro you want to read.

After you send this command successfully, you have permission to read **one command only**. To perform another read, you must send the permission request again.

There is another detail about this request: the Report ID you put in byte 1 does not determine which command you can read afterward, as long as that Report ID is valid. Once permission has been granted, you can read a different command.

After sending the request, you can check whether you have permission to read by issuing a Feature `GET_REPORT` for command `0xA0`.

If permission is available, the response is:

```text
a0 01 00 00 00 00 00 00
```

Otherwise, the response is:

```text
a0 00 00 00 00 00 00 00
```

Only after permission is available can you read a command correctly.

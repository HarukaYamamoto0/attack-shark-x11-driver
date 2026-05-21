# State Retrieval Protocol (Cold Boot)

This document describes how to retrieve the current internal state and configuration from the **Attack Shark X11** mouse when the driver or software first initializes.

## Overview

Unlike many simple HID devices that are write-only, the Attack Shark X11 supports reading back its configuration blocks. This is essential for "Cold Boot" synchronization, ensuring the UI reflects the actual hardware state.

## 1. Retrieval Sequence

The official software typically requests configuration blocks in the following order:

1.  **DPI & Sensor Settings** (Report ID `0x04`)
2.  **User Preferences & Lighting** (Report ID `0x05`)
3.  **Polling Rate** (Report ID `0x06`)

## 2. Request Structure (GET_REPORT)

To request a configuration block, use a USB Control Transfer with the following parameters:

| Parameter         | Value    | Description                                |
|:------------------|:---------|:-------------------------------------------|
| **bmRequestType** | `0xa1`   | Device-to-Host, Class, Interface           |
| **bRequest**      | `0x01`   | `GET_REPORT`                               |
| **wValue**        | `0x03XX` | `0x03` (Feature Report) + `XX` (Report ID) |
| **wIndex**        | `0x0002` | Interface 2 (HID)                          |
| **Length**        | `Size`   | See table below                            |

### Report Sizes
| Report ID | Function          | Expected Size (Bytes) |
|:----------|:------------------|:----------------------|
| **0x04**  | DPI / Sensor      | 56                    |
| **0x05**  | Preferences / RGB | 15                    |
| **0x06**  | Polling Rate      | 9                     |

## 3. Parsing the Response

The device returns a buffer of the requested size. The structure of the returned buffer is **identical** to the structure used when sending settings via `SET_REPORT`.

### Example: Reading DPI
1.  Send `GET_REPORT` for `wValue: 0x0304` with length 56.
2.  Receive 56 bytes.
3.  **Byte 24** contains the currently active DPI stage index.
4.  **Bytes 8–13** contain the values for the 6 DPI stages.
5.  **Byte 25** contains the Motion Sync state.

## 4. Real-time Status (Push Protocol)

Some information is not polled but instead "pushed" by the mouse via Interrupt Reports (Endpoint `0x83`).

-   **Battery Level**: Sent as `0x03 0x55 0x40 0x01 [Level]`.
-   **Handshake/Sync**: On connection, the mouse might push a packet starting with `0x03` to announce itself.

## 5. Implementation Tips (TypeScript/Node-USB)

To implement state retrieval in the driver:

```typescript
async function getReport(reportId: number, payloadSize: number): Promise<Buffer<ArrayBufferLike>> {
	this.checkIsOpen();

	await driver.controlTransfer({
		bmRequestType: 0xa1,
		bRequest: 0x01,
		wValue: 0x03a0,
		wIndex: 2,
		data: 64,
	});

	await driver.controlTransfer({
		bmRequestType: 0x21,
		bRequest: 0x09,
		wValue: 0x03a0,
		wIndex: 2,
		data: Buffer.from([0xa0, reportId, payloadSize, 0x00, 0x01, 0x00, 0x00, 0x00]),
	});

	// ACK
	await driver.controlTransfer({
		bmRequestType: 0xa1,
		bRequest: 0x01,
		wValue: 0x03a0,
		wIndex: 2,
		data: 64,
	});

	await delay(driver.delayMs);

	return (await driver.controlTransfer({
		bmRequestType: 0xa1,
		bRequest: 0x01,
		wValue: (0x03 << 8) | reportId,
		wIndex: 2,
		data: payloadSize,
	})) as unknown as Promise<Buffer>;
}

// Cold Boot Sync
const dpiSettings = await driver.getReport(0x04, 56);
const userPrefs = await driver.getReport(0x05, 15);
const pollingRate = await driver.getReport(0x06, 9);
```

**Note**: Always ensure Interface 2 is claimed before attempting control transfers to it.

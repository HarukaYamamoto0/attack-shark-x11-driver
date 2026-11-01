# Reading Report IDs

> [!TIP]
> To better understand this document, read the `README.md` located in the root of this directory first.

> [!NOTE]
> This protocol is not yet fully understood. Although the current findings are enough to perform reliable
> read operations, some fields and internal behaviors still require further investigation.

> [!CAUTION]
> Do not attempt to read Report ID `0x10`. Doing so may cause the mouse to enter **bootloader mode**.

This protocol allows the host to retrieve device settings through HID Feature Reports. However, reading a report
requires a preliminary handshake before the actual `GET_REPORT` request can be performed.

The mouse implements what appears to be a **single-use read authorization mechanism**. Before reading a report, the host
must request read access through Report ID `0xA0`.

Once the request is accepted, the host is allowed to perform a single read operation. Any subsequent read requires a new
authorization request.

Attempting to read a report without completing this procedure typically returns seemingly arbitrary or invalid data
rather than the expected configuration.

Based on the observed behavior, the read sequence consists of three steps:

1. **Request read access:** Send a `SET_REPORT` request to Report ID `0xA0`.
2. **Check read access:** Send a `GET_REPORT` request to Report ID `0xA0` to verify that the request was accepted.
3. **Read the target report:** Send a `GET_REPORT` request using the desired Report ID.

## Requesting Read Access

To request read access, send a HID Feature Report using `SET_REPORT` with Report ID `0xA0`.

The request uses the following structure:

| Offset | Example | Description              |
|--------|---------|--------------------------|
| 0      | `0xA0`  | Report ID                |
| 1      | `0x04`  | Target Report ID         |
| 2      | `0x38`  | Expected Response Length |
| 3      | `0x00`  | Unknown                  |
| 4      | `0x01`  | Parameter                |
| 5      | `0x00`  | Unknown                  |
| 6      | `0x00`  | Unknown                  |

Example request:

```hex
A0 04 38 00 01 00 00
```

### Offset 1 – Target Report ID

Specifies the Report ID that the host intends to read.

Interestingly, observations suggest that the resulting read access is not restricted to the Report ID specified in this
field. Once granted, it appears possible to read a different Report ID instead.

However, this field must still contain a valid Report ID for the request to be accepted.

### Offset 2 – Expected Response Length

Specifies the expected length of the target report's response.

Each supported Report ID has an associated response length, which must be provided when requesting read access.

The expected lengths are documented in their respective protocol documentation and are represented in the source code by
the `ReportReadLength` enum.

Providing an incorrect response length causes the mouse to reject the request.

### Offset 4 – Parameter

This field provides an additional parameter associated with the requested report.

Its exact semantics have not yet been fully determined, but its meaning appears to depend on the target Report ID.

For example:

- **Profile-specific settings:** When reading settings such as polling rate, this parameter identifies the profile whose
  configuration should be retrieved.
- **Macros:** When reading a macro, this parameter identifies the macro to retrieve.

Therefore, this field should not be interpreted exclusively as a Profile ID. It is better understood as a
**report-specific parameter**, whose meaning depends on the operation being performed.

## Checking Read Access

After requesting read access, the host can verify whether the request was accepted by sending a `GET_REPORT` request to
Report ID `0xA0`.

The documented response fields are:

| Offset | Example | Description        |
|--------|---------|--------------------|
| 0      | `0xA0`  | Report ID          |
| 1      | `0x01`  | Read Access Status |
| 2      | `0x00`  | Unknown            |
| 3      | `0x00`  | Unknown            |
| 4      | `0x00`  | Unknown            |
| 5      | `0x00`  | Unknown            |
| 6      | `0x00`  | Unknown            |

Example response:

```hex
A0 01 00 00 00 00 00
```

The byte at offset `1` indicates whether read access is available.

| Value  | Description                   |
|--------|-------------------------------|
| `0x00` | Read access is not available. |
| `0x01` | Read access is available.     |

**Note:** Earlier observations describe an 8-byte response, although only seven bytes (offsets `0–6`) have been
documented here. The remaining byte and exact response framing still require verification.

## Reading the Target Report

Once read access has been confirmed, the host can retrieve the requested configuration by sending a `GET_REPORT` request
using the target Report ID.

For example, if read access was requested for Report ID `0x04`, the host can subsequently retrieve its contents through
a `GET_REPORT` request targeting `0x04`.

The returned data should then contain the configuration associated with that report, following the structure documented
in its respective protocol specification.

**Important:** Read access is consumed after a successful read operation. To read the same report again or to retrieve
another report, the host must repeat the authorization procedure.

Since the mechanism appears to maintain a shared, single-use read state, implementations should serialize read
operations to prevent concurrent requests from interfering with one another.

### Known Limitations

The following aspects of the protocol remain under investigation:

- The exact purpose of the unknown bytes in the authorization request and response.
- Why the Target Report ID field does not appear to restrict which report can subsequently be read.
- Whether read access expires after a timeout or only after a read operation.
- Whether invalid or failed, read attempts to consume the available read access.
- The internal mechanism responsible for returning invalid data when read access has not been requested.

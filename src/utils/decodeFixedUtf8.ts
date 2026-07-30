export type UnicodeNormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

export interface DecodeFixedUtf8Options {
	/**
	 * Stops decoding at the first null byte (`0x00`).
	 *
	 * This is appropriate for fixed-size, null-terminated protocol fields.
	 *
	 * @default true
	 */
	nullTerminated?: boolean;

	/**
	 * Controls how malformed UTF-8 sequences are handled.
	 *
	 * - `"replace"` replaces malformed sequences with U+FFFD (`�`).
	 * - `"throw"` throws a `TypeError`.
	 *
	 * `"throw"` is preferable when malformed data indicates packet corruption
	 * or an invalid protocol implementation.
	 *
	 * @default "replace"
	 */
	invalidSequenceHandling?: 'replace' | 'throw';

	/**
	 * Unicode normalization applied after decoding.
	 *
	 * `NFC` is generally suitable for user-visible names because canonically
	 * equivalent sequences are represented consistently.
	 *
	 * Set to `false` to preserve the decoded Unicode representation exactly.
	 *
	 * @default false
	 */
	normalization?: UnicodeNormalizationForm | false;
}

export interface FixedUtf8DecodingResult {
	/**
	 * Decoded UTF-8 text.
	 */
	readonly value: string;

	/**
	 * Number of bytes consumed from the input before the null terminator or
	 * the end of the buffer.
	 */
	readonly bytesRead: number;

	/**
	 * Indicates whether a null terminator was found.
	 */
	readonly nullTerminated: boolean;

	/**
	 * Total number of bytes available in the input field.
	 */
	readonly fieldLength: number;
}

const UTF8_DECODER = new TextDecoder('utf-8', {
	fatal: false,
});

const STRICT_UTF8_DECODER = new TextDecoder('utf-8', {
	fatal: true,
});

/**
 * Decodes UTF-8 text stored in a fixed-length binary field.
 *
 * By default, decoding stops at the first null byte (`0x00`), allowing the
 * function to safely read null-terminated strings from fixed-size protocol
 * fields without including unused padding bytes.
 *
 * The function does not trim whitespace because leading and trailing spaces
 * may be meaningful protocol data.
 *
 * @param bytes - Fixed-length byte field containing UTF-8 encoded text.
 * @param options - Decoding, validation and normalization options.
 *
 * @returns The decoded value and metadata describing how the field was read.
 *
 * @throws {TypeError}
 * Thrown when `bytes` is not a `Uint8Array`.
 *
 * @throws {TypeError}
 * Thrown when malformed UTF-8 is found, and
 * `invalidSequenceHandling` is set to `"throw"`.
 *
 * @example Decode a null-terminated protocol field
 * ```ts
 * const field = Uint8Array.from([
 *     0x4d, 0x61, 0x63, 0x72, 0x6f,
 *     0x00, 0x00, 0x00,
 * ]);
 *
 * const result = decodeFixedUtf8(field);
 *
 * console.log(result.value); // "Macro"
 * console.log(result.bytesRead); // 5
 * console.log(result.nullTerminated); // true
 * ```
 *
 * @example Decode the complete field, including null bytes
 * ```ts
 * const result = decodeFixedUtf8(field, {
 *     nullTerminated: false,
 * });
 * ```
 *
 * @example Reject malformed UTF-8
 * ```ts
 * const result = decodeFixedUtf8(field, {
 *     invalidSequenceHandling: "throw",
 * });
 * ```
 */
export function decodeFixedUtf8(bytes: Uint8Array, options: DecodeFixedUtf8Options = {}): FixedUtf8DecodingResult {
	if (!(bytes instanceof Uint8Array)) {
		throw new TypeError(`bytes must be a Uint8Array; received ${describeValue(bytes)}.`);
	}

	const { nullTerminated = true, invalidSequenceHandling = 'replace', normalization = false } = options;

	const nullIndex = nullTerminated ? bytes.indexOf(0x00) : -1;
	const hasNullTerminator = nullIndex !== -1;
	const bytesRead = hasNullTerminator ? nullIndex : bytes.length;

	const encodedValue = bytes.subarray(0, bytesRead);

	const decoder = invalidSequenceHandling === 'throw' ? STRICT_UTF8_DECODER : UTF8_DECODER;

	const decodedValue = decoder.decode(encodedValue);
	const value = normalization === false ? decodedValue : decodedValue.normalize(normalization);

	return {
		value,
		bytesRead,
		nullTerminated: hasNullTerminator,
		fieldLength: bytes.length,
	};
}

/**
 * Produces a readable description for invalid runtime values.
 */
function describeValue(value: unknown): string {
	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	if (typeof value === 'object') {
		return value.constructor?.name ?? 'object';
	}

	return `${typeof value} (${String(value)})`;
}

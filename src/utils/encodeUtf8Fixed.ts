export type UnicodeNormalizationForm = 'NFC' | 'NFD' | 'NFKC' | 'NFKD';

export interface EncodeFixedUtf8Options {
	/**
	 * Unicode normalization applied before encoding.
	 *
	 * `NFC` is generally appropriate for user-visible names because it keeps
	 * canonically equivalent text in a consistent and usually compact form.
	 *
	 * Set to `false` to preserve the original Unicode representation.
	 *
	 * @default "NFC"
	 */
	normalization?: UnicodeNormalizationForm | false;

	/**
	 * Byte used to fill the unused portion of the resulting buffer.
	 *
	 * Must be an integer between `0x00` and `0xFF`.
	 *
	 * @default 0x00
	 */
	paddingByte?: number;

	/**
	 * Prevents truncation inside a Unicode grapheme cluster when
	 * `Intl.Segmenter` is available.
	 *
	 * This protects compound characters such as emoji sequences, flags,
	 * skin-tone modifiers, and combining marks.
	 *
	 * When `Intl.Segmenter` is unavailable, the implementation falls back to
	 * Unicode code-point boundaries, which still guarantees valid UTF-8.
	 *
	 * @default true
	 */
	preserveGraphemes?: boolean;
}

export interface FixedUtf8EncodingResult {
	/**
	 * Fixed-length UTF-8 buffer, padded to the requested size.
	 */
	readonly bytes: Uint8Array;

	/**
	 * Number of bytes occupied by encoded text, excluding padding.
	 */
	readonly bytesWritten: number;

	/**
	 * Number of bytes the complete normalized string would require.
	 */
	readonly originalByteLength: number;

	/**
	 * Indicates whether part of the input was omitted because it exceeded
	 * the byte limit.
	 */
	readonly truncated: boolean;
}

const UTF8_ENCODER = new TextEncoder();

/**
 * Encodes text as UTF-8 into a fixed-length byte buffer.
 *
 * The function never truncates inside a UTF-8 sequence. When supported by the
 * runtime, it can also avoid truncating inside Unicode grapheme clusters.
 *
 * Unused bytes are filled with the configured padding byte.
 *
 * @param text - Text to encode.
 * @param byteLength - Exact length of the returned byte buffer.
 * @param options - Encoding, normalization, and padding options.
 *
 * @returns The fixed-length buffer and metadata about the encoding operation.
 *
 * @throws {RangeError}
 * Thrown when `byteLength` is not a non-negative safe integer.
 *
 * @throws {RangeError}
 * Thrown when `paddingByte` is not an integer between `0x00` and `0xFF`.
 *
 * @example
 * ```ts
 * const result = encodeFixedUtf8("Macro 你好", 20);
 *
 * console.log(result.bytes.length); // 20
 * console.log(result.bytesWritten);
 * console.log(result.truncated);
 * ```
 *
 * @example
 * ```ts
 * const { bytes: macroNameBytes, truncated } = encodeFixedUtf8(
 *     options.macroName,
 *     20,
 * );
 *
 * packet.set(macroNameBytes, macroNameOffset);
 *
 * if (truncated) {
 *     console.warn("Macro name was truncated to fit the protocol field.");
 * }
 * ```
 */
export function encodeFixedUtf8(
	text: string,
	byteLength: number,
	options: EncodeFixedUtf8Options = {},
): FixedUtf8EncodingResult {
	assertValidByteLength(byteLength);

	const { normalization = 'NFC', paddingByte = 0x00, preserveGraphemes = true } = options;

	assertValidByte(paddingByte, 'paddingByte');

	const normalizedText = normalization === false ? text : text.normalize(normalization);

	const completeEncoding = UTF8_ENCODER.encode(normalizedText);
	const output = new Uint8Array(byteLength);

	if (paddingByte !== 0x00) {
		output.fill(paddingByte);
	}

	if (completeEncoding.length <= byteLength) {
		output.set(completeEncoding);

		return {
			bytes: output,
			bytesWritten: completeEncoding.length,
			originalByteLength: completeEncoding.length,
			truncated: false,
		};
	}

	let offset = 0;

	for (const segment of iterateUnicodeSegments(normalizedText, preserveGraphemes)) {
		const encodedSegment = UTF8_ENCODER.encode(segment);

		if (offset + encodedSegment.length > byteLength) {
			break;
		}

		output.set(encodedSegment, offset);
		offset += encodedSegment.length;
	}

	return {
		bytes: output,
		bytesWritten: offset,
		originalByteLength: completeEncoding.length,
		truncated: true,
	};
}

/**
 * Iterates over grapheme clusters when possible, falling back to Unicode
 * code points when `Intl.Segmenter` is unavailable or disabled.
 */
function* iterateUnicodeSegments(text: string, preserveGraphemes: boolean): Generator<string> {
	if (preserveGraphemes && typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: 'grapheme',
		});

		for (const entry of segmenter.segment(text)) {
			yield entry.segment;
		}

		return;
	}

	/*
	 * String iteration operates on Unicode code points rather than UTF-16
	 * code units, so surrogate pairs cannot be split here.
	 */
	yield* text;
}

function assertValidByteLength(value: number): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError(`byteLength must be a non-negative safe integer; received ${value}.`);
	}
}

function assertValidByte(value: number, parameterName: string): void {
	if (!Number.isInteger(value) || value < 0x00 || value > 0xff) {
		throw new RangeError(`${parameterName} must be an integer between 0x00 and 0xFF; received ${value}.`);
	}
}

export interface DecodeFixedUtf8Options {
	/**
	 * Byte used as padding in the fixed-length field.
	 *
	 * Trailing occurrences of this byte are removed before decoding.
	 *
	 * @default 0x00
	 */
	paddingByte?: number;

	/**
	 * When `true`, throws if the byte sequence contains invalid UTF-8.
	 *
	 * When `false`, invalid sequences are replaced with the Unicode
	 * replacement character (`U+FFFD`).
	 *
	 * @default true
	 */
	fatal?: boolean;

	/**
	 * Unicode normalization applied after decoding.
	 *
	 * Set to `false` to preserve the decoded Unicode representation.
	 *
	 * @default false
	 */
	normalization?: UnicodeNormalizationForm | false;
}

/**
 * Decodes UTF-8 text from a fixed-length byte buffer.
 *
 * Trailing padding bytes are removed before decoding.
 *
 * @param bytes - Fixed-length UTF-8 byte buffer.
 * @param options - Decoding, padding, and normalization options.
 *
 * @returns The decoded string.
 *
 * @throws {RangeError}
 * Thrown when `paddingByte` is not an integer between `0x00` and `0xFF`.
 *
 * @throws {TypeError}
 * Thrown when `fatal` is enabled and the buffer contains invalid UTF-8.
 *
 * @example
 * ```ts
 * const encoded = encodeFixedUtf8("Macro 你好", 20);
 * const decoded = decodeFixedUtf8(encoded.bytes);
 *
 * console.log(decoded); // "Macro 你好"
 * ```
 *
 * @example
 * ```ts
 * const macroName = decodeFixedUtf8(
 *     packet.subarray(macroNameOffset, macroNameOffset + 20),
 * );
 * ```
 */
export function decodeFixedUtf8(bytes: Uint8Array, options: DecodeFixedUtf8Options = {}): string {
	const { paddingByte = 0x00, fatal = true, normalization = false } = options;

	assertValidByte(paddingByte, 'paddingByte');

	let end = bytes.length;

	while (end > 0 && bytes[end - 1] === paddingByte) {
		end--;
	}

	const decoder = new TextDecoder('utf-8', {
		fatal,
	});

	const text = decoder.decode(bytes.subarray(0, end));

	return !normalization ? text : text.normalize(normalization);
}

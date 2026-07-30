export type UnicodeNormalizationForm = "NFC" | "NFD" | "NFKC" | "NFKD";

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

	const {
		normalization = "NFC",
		paddingByte = 0x00,
		preserveGraphemes = true,
	} = options;

	assertValidByte(paddingByte, "paddingByte");

	const normalizedText =
		normalization === false ? text : text.normalize(normalization);

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

	for (const segment of iterateUnicodeSegments(
		normalizedText,
		preserveGraphemes,
	)) {
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
function* iterateUnicodeSegments(
	text: string,
	preserveGraphemes: boolean,
): Generator<string> {
	if (
		preserveGraphemes &&
		typeof Intl !== "undefined" &&
		typeof Intl.Segmenter === "function"
	) {
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: "grapheme",
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
		throw new RangeError(
			`byteLength must be a non-negative safe integer; received ${value}.`,
		);
	}
}

function assertValidByte(value: number, parameterName: string): void {
	if (!Number.isInteger(value) || value < 0x00 || value > 0xff) {
		throw new RangeError(
			`${parameterName} must be an integer between 0x00 and 0xFF; received ${value}.`,
		);
	}
}

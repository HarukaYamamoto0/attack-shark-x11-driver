/**
 * Inserts a space every two characters in the input string.
 *
 * @param {string} input - The string to process.
 * @return {string} The resulting string with spaces added every two characters.
 */
export function addSpacingEvery2Chars(input: string): string {
    return input.match(/.{1,2}/g)?.join(" ") ?? "";
}
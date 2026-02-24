// Source - https://stackoverflow.com/a/37764963
// Posted by v-andrew, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-22, License - CC BY-SA 4.0

/**
 * Pauses the execution of code for a specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to delay the execution.
 * @return {Promise<void>} A promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

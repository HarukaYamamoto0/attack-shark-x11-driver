// Source - https://stackoverflow.com/a/37764963
// Posted by v-andrew, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-22, License - CC BY-SA 4.0

/**
 * Pauses execution for the specified number of milliseconds.
 *
 * @param ms Number of milliseconds to delay execution.
 * @returns A Promise that resolves after the specified delay.
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

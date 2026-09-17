/**
 * Returns a random item from a non-empty array.
 *
 * The original array is not modified.
 *
 * @template T The type of the items in the array.
 * @param items The array from which an item will be selected.
 * @returns A randomly selected item.
 * @throws {RangeError} If the array is empty.
 *
 * @example
 * const colors = ['red', 'green', 'blue'] as const;
 * const color = getRandomItem(colors);
 *
 * console.log(color); // 'red', 'green', or 'blue'
 */
export function getRandomItem<T>(items: readonly T[]): T {
	if (items.length === 0) {
		throw new RangeError('Cannot select a random item from an empty array.');
	}

	const selectedIndex = Math.floor(Math.random() * items.length);

	for (const [index, item] of items.entries()) {
		if (index === selectedIndex) {
			return item;
		}
	}

	throw new Error('Failed to select an item due to an invalid array state.');
}

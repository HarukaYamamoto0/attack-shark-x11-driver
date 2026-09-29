/**
 * Produces a human-readable description of a value for error messages.
 *
 * @param value - The value to describe.
 * @returns A string representation of the value and its type.
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

/**
 * Asserts that the repetition count is a valid non-negative safe integer.
 *
 * @param times - The value to validate.
 * @throws {TypeError} If `times` is not of type number.
 * @throws {RangeError} If `times` is NaN, infinite, fractional, negative, or not a safe integer.
 */
function assertValidTimes(times: number): void {
	if (typeof times !== 'number') {
		throw new TypeError(`times must be a number; received ${describeValue(times)}.`);
	}

	if (Number.isNaN(times)) {
		throw new RangeError('times must be a non-negative safe integer; received NaN.');
	}

	if (!Number.isFinite(times)) {
		throw new RangeError(`times must be a finite number; received ${times}.`);
	}

	if (!Number.isInteger(times)) {
		throw new RangeError(`times must be an integer; received ${times}.`);
	}

	if (times < 0) {
		throw new RangeError(`times must be a non-negative integer; received ${times}.`);
	}

	if (!Number.isSafeInteger(times)) {
		throw new RangeError(`times must be a safe integer (<= ${Number.MAX_SAFE_INTEGER}); received ${times}.`);
	}
}

/**
 * Asserts that the action callback is a valid function.
 *
 * @param action - The value to validate.
 * @throws {TypeError} If `action` is not a function.
 */
function assertValidAction(action: unknown): asserts action is (index: number, times: number) => void {
	if (typeof action !== 'function') {
		throw new TypeError(`action must be a function; received ${describeValue(action)}.`);
	}
}

/**
 * Repeats the synchronous execution of a callback function a specified number of times.
 *
 * This utility serves as a clean, declarative, and robust alternative to manual counted
 * loops (such as `for (let i = 0; i < n; i++)`).
 *
 *
 * ### Differences & Comparison with a traditional `for (let i = 0; i < n; i++)` loop
 *
 * 1. **Declarative Intent vs. Imperative Mechanics**:
 *    - `repeat` clearly conveys the intent ("execute this logic N times") without the boilerplate
 *      of managing loop variable declarations, boundary conditions, and increment steps.
 *    - Eliminates common off-by-one errors (such as using `<=` instead of `<`, wrong step sizes,
 *      or accidental decrementing).
 *
 * 2. **Runtime Safety & Fail-Fast Validation**:
 *    - In a raw `for (let i = 0; i < n; i++)`, passing invalid values such as `NaN`, negative numbers,
 *      floating-point values, `Infinity`, or non-numbers can lead to silent skips, unintended infinite
 *      loops, or subtle bugs.
 *    - `repeat` strictly validates inputs upfront, throwing descriptive `TypeError` or `RangeError`
 *      exceptions when given invalid arguments.
 *
 * 3. **Lexical Scope & Variable Isolation**:
 *    - Each iteration in `repeat` is executed within its own function call frame.
 *    - Variables created within the callback are cleanly isolated to that specific iteration,
 *      preventing accidental variable leakage or closure capture bugs across iterations.
 *
 * 4. **Control Flow Semantics (`return`, `break`, `continue`, `await`)**:
 *    - **Return**: Calling `return` inside the `action` callback immediately terminates the *current*
 *      iteration and proceeds to the next iteration — acting exactly like `continue` in a `for` loop.
 *      It does not exit the outer enclosing function.
 *    - **Break**: `repeat` runs all iterations to completion and does not support the `break` statement.
 *      If early exit is required, use a standard `for` loop or throw an exception.
 *    - **Async / Await**: `repeat` is synchronous. If you pass an `async` function, promises will be
 *      created concurrently without awaiting their resolution. Use `for...of` or a custom async utility
 *      when sequential asynchronous execution is required.
 *
 * 5. **Performance Considerations**:
 *    - For the vast majority of application tasks (protocol encoding, array initialization, buffer setup),
 *      the execution overhead of function calls is negligible compared to the gains in safety and clarity.
 *    - In ultra-hot performance paths executing millions of iterations per second, a raw `for` loop may
 *      be preferred to avoid call stack overhead.
 *
 * ---
 *
 * @param times - The number of times the action should be executed. Must be a non-negative safe integer.
 * @param action - The callback function to invoke on each iteration. Receives the current 0-based iteration
 * index (`index`) and the total repetition count (`times`).
 *
 * @returns {void} Does not return a value.
 *
 * @throws {TypeError} If `times` is not of type number or `action` is not a function.
 * @throws {RangeError} If `times` is negative, NaN, infinite, fractional, or exceeds `Number.MAX_SAFE_INTEGER`.
 *
 * @example Basic repetition
 * ```ts
 * repeat(3, () => {
 *     console.log("Ping");
 * });
 * // Output:
 * // "Ping"
 * // "Ping"
 * // "Ping"
 * ```
 *
 * @example Accessing the iteration index and total count
 * ```ts
 * const slots: string[] = [];
 *
 * repeat(4, (index, total) => {
 *     slots.push(`Slot ${index + 1} of ${total}`);
 * });
 *
 * console.log(slots);
 * // Output: ["Slot 1 of 4", "Slot 2 of 4", "Slot 3 of 4", "Slot 4 of 4"]
 * ```
 *
 * @example Hardware driver initialization (e.g., default button slots)
 * ```ts
 * // Resetting 18 button mapping slots in a protocol builder
 * repeat(18, (slotIndex) => {
 *     builder.setButton(slotIndex, new SlotButton(FirmwareAction.DISABLE_BUTTON, 0x00, 0x00));
 * });
 * ```
 *
 * @example Using return to skip remaining logic in an iteration (like `continue`)
 * ```ts
 * repeat(5, (index) => {
 *     if (index % 2 === 0) {
 *         return; // Skips even indexes, continues with the next iteration
 *     }
 *     console.log(`Odd index: ${index}`);
 * });
 * // Output:
 * // "Odd index: 1"
 * // "Odd index: 3"
 * ```
 */
export function repeat(times: number, action: (index: number, times: number) => void): void {
	assertValidTimes(times);
	assertValidAction(action);

	for (let i = 0; i < times; i++) {
		action(i, times);
	}
}

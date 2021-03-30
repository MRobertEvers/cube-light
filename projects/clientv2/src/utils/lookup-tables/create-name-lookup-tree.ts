export function createNameLookupTree(nameIter: Generator<string> | string[]): any {
	const lookup: Record<string, any> = {};

	for (const name of nameIter) {
		let current = lookup;
		for (const char of name) {
			if (typeof current[char] === 'undefined') {
				current[char] = {};
			}
			current = current[char];
		}

		// Indicate that there is a card name that stops here.
		current['$'] = {};
	}

	return lookup;
}

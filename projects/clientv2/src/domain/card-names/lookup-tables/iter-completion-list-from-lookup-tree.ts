const TERMINATION_SYMBOL = '$';

export function* iterCompletionListFromLookupTree(
	base: string,
	lookupTree: any
): Generator<string> {
	let traversal: string[] = [base];
	const stack: [string, number, any][] = [['', traversal.length, lookupTree]];

	// DFS
	while (stack.length !== 0) {
		const [key, depth, tree] = stack.pop()!;
		traversal = traversal.slice(0, depth);

		if (key === TERMINATION_SYMBOL) {
			yield traversal.join('');
		}

		traversal.push(key);

		let next: [string, number, any][] = [];
		for (const [char, followTree] of Object.entries(tree)) {
			next.push([char, depth + 1, followTree]);
		}

		next = next.sort((entry, entry1) => {
			const [a] = entry;
			const [b] = entry1;
			return a < b ? 1 : -1;
		});
		for (const entry of next) stack.push(entry);
	}
}

export function getFirstNCompletionsFromLookupTree(
	n: number,
	base: string,
	lookupTree: any
): string[] {
	const words: string[] = [];
	const iter = iterCompletionListFromLookupTree(base, lookupTree);

	let result = iter.next();
	while (!result.done && words.length < n) {
		words.push(result.value);

		result = iter.next();
	}

	return words;
}

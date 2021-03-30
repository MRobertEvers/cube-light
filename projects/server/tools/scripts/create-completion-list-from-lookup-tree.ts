const TERMINATION_SYMBOL = '$';

function deepMerge(branchOne: any, branchTwo: any) {
	if (!branchOne || !branchTwo) {
		return branchOne || branchTwo;
	} else {
		const result = { ...branchTwo };

		for (const [key, followTree] of Object.entries(branchOne)) {
			const otherTree = branchTwo[key];
			if (typeof otherTree === 'undefined') {
				result[key] = followTree;
			} else {
				result[key] = deepMerge(otherTree, followTree);
			}
		}

		return result;
	}
}

export function getStartTreeFromRoot(base: string, lookupTree: any): any {
	let lookup: any = lookupTree;

	for (const char of base) {
		const branchOne = lookup[char.toLowerCase()];
		const branchTwo = lookup[char.toUpperCase()];
		lookup = deepMerge(branchOne, branchTwo);

		if (typeof lookup === 'undefined') {
			return {};
		}
	}

	return lookup;
}

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

		// for (const [char, followTree] of Object.entries(tree)) {
		// 	stack.push([depth + 1, char, followTree]);
		// }

		let next: [string, number, any][] = [];
		for (const [char, followTree] of Object.entries(tree)) {
			next.push([char, depth + 1, followTree]);
		}

		next = next.sort(([a], [b]) => (a < b ? 1 : -1));
		stack.push(...next);
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

export function createCompletionListFromLookupTree(base: string, lookupTree: any): string[] {
	const words: string[] = [];
	let traversal: string[] = [base];

	let depth = 1;
	const stack: [string, number, any][] = [['', depth, lookupTree]];

	// DFS
	while (stack.length !== 0) {
		const [key, depth, tree] = stack.pop()!;
		traversal = traversal.slice(0, depth);

		if (key === TERMINATION_SYMBOL) {
			words.push(traversal.join(''));
		}

		traversal.push(key);

		let next: [string, number, any][] = [];
		for (const [char, followTree] of Object.entries(tree)) {
			next.push([char, depth + 1, followTree]);
		}

		next = next.sort(([a], [b]) => (a < b ? 1 : -1));
		stack.push(...next);
	}

	return words;
}

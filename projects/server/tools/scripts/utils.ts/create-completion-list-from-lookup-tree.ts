const TERMINATION_SYMBOL = '$';

/**
 *
 * @param base
 * @param lookupTree
 * @returns
 */
export function getTraversalsFromBaseInLookupTree(
	base: string,
	lookupTree: any
): Array<[string, any]> {
	let level: [string[], any][] = [[[], lookupTree]];
	let next: [string[], any][] = [];

	for (const char of base) {
		const branchKeys = Array.from(new Set(compareLaxSpecialCharacters(char)));

		for (const [traversal, tree] of level) {
			const branches: [string[], any][] = branchKeys
				.filter((key) => tree[key])
				.map((key) => [traversal.concat([key]), tree[key]]);
			next.push(...branches);
		}

		level = next;
		next = [];
	}

	return level.map(([traversal, tree]) => [traversal.join(''), tree]);
}

function deepMerge(branchOne: any, branchTwo: any): any | undefined {
	if (!branchOne || !branchTwo) {
		return branchOne || branchTwo;
	} else {
		const result = { ...branchOne };

		for (const [key, followTree] of Object.entries(branchTwo)) {
			const otherTree = branchOne[key];
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

function deepMergeEx(...branches: any[]): any | undefined {
	const cleaned = branches.filter(Boolean);

	if (cleaned.length === 0) {
		return undefined;
	}

	const [first, ...others] = cleaned;

	let result = first;
	for (const other of others) {
		result = deepMerge(result, other);
	}

	return result;
}

export function compareNoCase(char: string) {
	return [char.toUpperCase(), char.toLowerCase()];
}

export function compareLaxSpecialCharacters(char: string) {
	return [char.toUpperCase(), char.toLowerCase(), ',', "'"];
}

export function getStartTreeFromRootEx(
	base: string,
	lookupTree: any,
	equivalentBranches: (char: string) => string[] = compareNoCase
): any {
	let lookup: any = lookupTree;

	for (const char of base) {
		const branchKeys = Array.from(new Set(equivalentBranches(char)));
		const branches = branchKeys.map((key) => lookup[key]);
		lookup = deepMergeEx(...branches);

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

export function* iterMatchesInLookupTree(base: string, lookupTree: any): Generator<string> {
	let traversals = getTraversalsFromBaseInLookupTree(base, lookupTree);

	for (const [traversal, tree] of traversals) {
		yield* iterCompletionListFromLookupTree(traversal, tree);
	}
}

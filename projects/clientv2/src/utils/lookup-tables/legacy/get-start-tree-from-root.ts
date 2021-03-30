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

export function deepMergeEx(...branches: any[]): any | undefined {
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

export function compareExact(char: string) {
	return [char];
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

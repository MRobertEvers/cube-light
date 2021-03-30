function deepMerge2(branchOne: any, branchTwo: any): any | undefined {
	if (!branchOne || !branchTwo) {
		return branchOne || branchTwo;
	} else {
		const result = { ...branchOne };

		for (const [key, followTree] of Object.entries(branchTwo)) {
			const otherTree = branchOne[key];
			if (typeof otherTree === 'undefined') {
				result[key] = followTree;
			} else {
				result[key] = deepMerge2(otherTree, followTree);
			}
		}

		return result;
	}
}

export function deepMerge(...branches: any[]): any | undefined {
	const cleaned = branches.filter(Boolean);

	if (cleaned.length === 0) {
		return undefined;
	}

	const [first, ...others] = cleaned;

	let result = first;
	for (const other of others) {
		result = deepMerge2(result, other);
	}

	return result;
}

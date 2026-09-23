export function compareExact(char: string) {
	return [char];
}

export function compareNoCase(char: string) {
	return [char.toUpperCase(), char.toLowerCase()];
}

export function compareLaxSpecialCharacters(char: string) {
	return [char.toUpperCase(), char.toLowerCase(), ',', "'"];
}

/**
 *
 * @param base
 * @param lookupTree
 * @returns
 */
export function getTraversalsFromBaseInLookupTreeSimple(
	base: string,
	lookupTree: any,
	equivalentBranchesArg?: (char: string) => string[]
): Array<[string, any]> {
	const equivalentBranches =
		equivalentBranchesArg === undefined
			? compareNoCase
			: equivalentBranchesArg;

	let level: [string[], any][] = [[[], lookupTree]];
	let next: [string[], any][] = [];

	for (const char of base) {
		const branchKeys = Array.from(new Set(equivalentBranches(char)));

		for (const [traversal, tree] of level) {
			const branches: [string[], any][] = branchKeys
				.filter((key) => tree[key])
				.map((key) => [traversal.concat([key]), tree[key]]);
			next.push(...branches);
		}

		level = next;
		next = [];
	}

	return level.map((entry) => {
		const [traversal, tree] = entry;
		return [traversal.join(''), tree];
	});
}

export function getTraversalsFromBaseInLookupTree(
	base: string,
	lookupTree: any,
	equivalentBranchesArg?: (char: string) => string[],
	ignoreCharsArg?: string[]
): Array<[string, any]> {
	const equivalentBranches =
		equivalentBranchesArg === undefined
			? compareNoCase
			: equivalentBranchesArg;
	const ignoreChars =
		ignoreCharsArg === undefined ? [',', "'"] : ignoreCharsArg;

	let level: [string[], any][] = [[[], lookupTree]];
	let next: [string[], any][] = [];

	for (const char of base) {
		const branchKeys = Array.from(new Set(equivalentBranches(char)));

		for (const [traversal, tree] of level) {
			const branches: [string[], any][] = branchKeys
				.filter((key) => tree[key])
				.map((key) => [traversal.concat([key]), tree[key]]);

			for (const ignoreChar of ignoreChars.filter(
				(key) => key !== char && tree[key]
			)) {
				const skippedTree = tree[ignoreChar];
				const laxBranches: [string[], any][] = branchKeys
					.filter((key) => skippedTree[key])
					.map((key) => [
						traversal.concat([ignoreChar, key]),
						skippedTree[key]
					]);
				branches.push(...laxBranches);
			}

			next.push(...branches);
		}

		level = next;
		next = [];
	}

	return level.map((entry) => {
		const [traversal, tree] = entry;
		return [traversal.join(''), tree];
	});
}

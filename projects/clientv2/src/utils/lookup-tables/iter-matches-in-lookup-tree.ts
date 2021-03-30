import { getTraversalsFromBaseInLookupTree } from './get-traversals-from-base-in-lookup-tree';
import { iterCompletionListFromLookupTree } from './iter-completion-list-from-lookup-tree';

export function* iterMatchesInLookupTree(base: string, lookupTree: any): Generator<string> {
	let traversals = getTraversalsFromBaseInLookupTree(base, lookupTree);

	for (const [traversal, tree] of traversals) {
		yield* iterCompletionListFromLookupTree(traversal, tree);
	}
}

export function getFirstNMatchesInLookupTree(n: number, base: string, lookupTree: any): string[] {
	const words: string[] = [];
	const iter = iterMatchesInLookupTree(base, lookupTree);

	let result = iter.next();
	while (!result.done && words.length < n) {
		words.push(result.value);

		result = iter.next();
	}

	return words;
}

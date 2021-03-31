import { MTGJSONAllPrintings, MTGJSONCard } from './read-all-printings';

export function* iterAllCards(allPrintings: MTGJSONAllPrintings): Generator<MTGJSONCard> {
	const lookup: Record<string, any> = {};
	for (const set of Object.values(allPrintings.data)) {
		for (const card of set.cards) {
			yield card;
		}
	}

	return lookup;
}

import { MTGJSONAllPrintings } from './read-all-printings';

export function* iterAllPrintingCardNames(allPrintings: MTGJSONAllPrintings): Generator<string> {
	const lookup: Record<string, any> = {};
	for (const set of Object.values(allPrintings.data)) {
		for (const card of set.cards) {
			yield card.name;
		}
	}

	return lookup;
}

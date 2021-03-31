import { iterAllCards } from './iter-all-cards';
import { MTGJSONAllPrintings } from './read-all-printings';

export function* iterAllPrintingCardNames(allPrintings: MTGJSONAllPrintings): Generator<string> {
	for (const card of iterAllCards(allPrintings)) {
		yield card.name;
	}
}

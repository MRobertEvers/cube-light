import { iterAllCards } from './iter-all-cards';

export function* iterAllPrintingCardNames(sqlitePath: string): Generator<string> {
	for (const card of iterAllCards(sqlitePath)) {
		yield card.name;
	}
}

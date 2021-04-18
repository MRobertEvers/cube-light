import { FetchAPIDeckResponse } from 'src/api/fetch-api-deck';

export function* iterDeckCardNames(deck: FetchAPIDeckResponse) {
	for (const card of deck.cards) {
		yield card.name;
	}
}

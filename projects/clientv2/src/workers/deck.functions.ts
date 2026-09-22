import { fetchAPINameLookup } from '../api/fetch-api-get-card-names-lookup';

import { fetchAPIAddCard } from '../api/fetch-api-add-card';
import { fetchAPIDeck } from '../api/fetch-api-deck';
import { fetchAPISetCard, SetCardAction } from '../api/fetch-api-set-card';
import { GetDeckResponse } from './deck.worker.messages';

export async function fetchSortedSuggestions(
	search: string
): Promise<{ sorted: string[]; set: Set<string> }> {
	// TODO: Better way to do this?
	const index = await fetchAPINameLookup();

	const suggestions = index.getFirstNMatches(10, search);

	const result = {
		sorted: suggestions,
		set: new Set(suggestions.map((item) => item.toLowerCase()))
	};

	return result;
}

export async function fetchAddCardCommand(
	deckId: string,
	cardName: string,
	countArg?: number
): Promise<boolean> {
	const count = countArg === undefined ? 1 : countArg;

	return fetchAPIAddCard(deckId, cardName, count);
}

export async function fetchSetCardCommand(
	deckId: string,
	cardName: string,
	action: SetCardAction,
	count: number
): Promise<void> {
	await fetchAPISetCard(deckId, cardName, action, count);
}

export async function fetchSortedDeck(
	deckId: string
): Promise<GetDeckResponse> {
	const data = await fetchAPIDeck(deckId);

	const { cards } = data;

	const deck: GetDeckResponse['deck'] = {
		count: 0,
		cardCategories: {}
	};
	const deckCards = deck.cardCategories;
	for (const card of cards) {
		// Creature takes precedence over other types when grouping the deck.
		const category = /\bCreature\b/i.test(card.types) ? 'Creature' : card.types;
		if (!(category in deckCards)) {
			deckCards[category] = {
				count: 0,
				cards: []
			};
		}

		const count = card.count;

		deckCards[category].count += count;
		deckCards[category].cards.push(card);

		deck.count += count;
	}

	return {
		...data,
		deck: deck
	};
}

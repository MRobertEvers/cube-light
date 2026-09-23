import { fetchAPINameLookup } from '../api/fetch-api-get-card-names-lookup';

import { fetchAPIAddCard } from '../api/fetch-api-add-card';
import {
	DeckBoard,
	fetchAPIDeck,
	FetchAPIDeckCardResponse,
	FetchAPIDeckResponse
} from '../api/fetch-api-deck';
import { fetchAPISetCard, SetCardAction } from '../api/fetch-api-set-card';
import { DeckMappedData, GetDeckResponse } from './deck.worker.messages';
import type { NameIndexSearchCursor } from '../utils/lookup-tables/name-index-wasm';

let suggestionCursor: NameIndexSearchCursor | undefined;

export async function fetchSortedSuggestions(
	search: string
): Promise<{ sorted: string[]; set: Set<string> }> {
	// TODO: Better way to do this?
	const index = await fetchAPINameLookup();
	suggestionCursor ??= index.createSearchCursor(10);

	const suggestions = suggestionCursor.getFirstNMatches(search);

	const result = {
		sorted: suggestions,
		set: new Set(suggestions.map((item) => item.toLowerCase()))
	};

	return result;
}

export async function fetchAddCardCommand(
	deckId: string,
	cardName: string,
	countsArg?: Partial<Record<DeckBoard, number>>
): Promise<boolean> {
	const counts = countsArg === undefined ? { main: 1 } : countsArg;

	return fetchAPIAddCard(deckId, cardName, counts);
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
	return groupDeck(data);
}

export function groupDeck(data: FetchAPIDeckResponse): GetDeckResponse {
	const { cards, sideboard = [] } = data;
	const main = groupBoardCards(cards);

	return {
		...data,
		sideboard,
		deck: main,
		boards: { main, side: groupBoardCards(sideboard) }
	};
}

/** Groups one board's entries by card type, counting every copy. */
export function groupBoardCards(
	cards: readonly FetchAPIDeckCardResponse[]
): DeckMappedData {
	const deck: DeckMappedData = {
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

	return deck;
}

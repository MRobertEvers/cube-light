import { fetchAPISuggestions } from '../fetch-api-suggestions';
import { fetchAPIAddCard } from '../fetch-api-add-card';
import { fetchAPIDeck } from '../fetch-api-deck';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { fetchAPISetCard, SetCardAction } from '../fetch-api-set-card';

export async function fetchSortedSuggestions(
	search: string
): Promise<{ sorted: string[]; set: Set<string> }> {
	const suggestionArray = await fetchAPISuggestions(search);

	const deduped = new Set(suggestionArray);
	const dedupedArray = Array.from(deduped).sort();
	const front: string[] = [];
	const back: string[] = [];
	const testName = search.toLowerCase();
	for (const name of dedupedArray) {
		if (name.toLowerCase().indexOf(testName) === 0) {
			front.push(name);
		} else {
			back.push(name);
		}
	}
	const sorted = front.concat(back);
	const result = {
		sorted: sorted,
		set: new Set(sorted.map((item) => item.toLowerCase()))
	};

	return result;
}

export async function fetchAddCardCommand(cardName: string): Promise<void> {
	await fetchAPIAddCard('1', cardName);
}

export async function fetchSetCardCommand(
	cardName: string,
	action: SetCardAction,
	count: number
): Promise<void> {
	await fetchAPISetCard('1', cardName, action, count);
}

export async function fetchSortedDeck(deckId: string): Promise<GetDeckResponse> {
	const data = await fetchAPIDeck(deckId);

	const { cards } = data;

	const deck: GetDeckResponse['deck'] = {
		count: 0,
		cardCategories: {}
	};
	const deckCards = deck.cardCategories;
	for (const card of cards) {
		// TODO: multiple types.
		if (!(card.types in deckCards)) {
			deckCards[card.types] = {
				count: 0,
				cards: []
			};
		}

		const count = card.count;

		deckCards[card.types].count += count;
		deckCards[card.types].cards.push(card);

		deck.count += count;
	}

	return {
		...data,
		deck: deck
	};
}

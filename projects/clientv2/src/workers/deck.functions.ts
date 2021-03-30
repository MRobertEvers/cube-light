import { fetchAPINameLookup } from 'src/api/fetch-api-get-card-names-lookup';
import {
	getFirstNCompletionsFromLookupTree,
	getStartTreeFromRoot
} from 'src/utils/iter-completion-list-from-lookup-tree';
import { fetchAPIAddCard } from '../api/fetch-api-add-card';
import { fetchAPIDeck } from '../api/fetch-api-deck';
import { fetchAPISetCard, SetCardAction } from '../api/fetch-api-set-card';
import { fetchAPISuggestions } from '../api/fetch-api-suggestions';
import { GetDeckResponse } from './deck.worker.messages';

export async function fetchSortedSuggestions(
	search: string
): Promise<{ sorted: string[]; set: Set<string> }> {
	// TODO: Better way to do this?
	const fullTree = await fetchAPINameLookup();

	const tree = getStartTreeFromRoot(search, fullTree);
	const suggestions = getFirstNCompletionsFromLookupTree(10, search, tree);

	const result = {
		sorted: suggestions,
		set: new Set(suggestions.map((item) => item.toLowerCase()))
	};

	return result;
}

export async function fetchAddCardCommand(
	deckId: string,
	cardName: string,
	count = 1
): Promise<void> {
	await fetchAPIAddCard(deckId, cardName, count);
}

export async function fetchSetCardCommand(
	deckId: string,
	cardName: string,
	action: SetCardAction,
	count: number
): Promise<void> {
	await fetchAPISetCard(deckId, cardName, action, count);
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

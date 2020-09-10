import {
	GetSuggestionsCommand,
	GetSuggestionsResponse,
	AddCardCommand,
	AddCardResponse,
	GetDeckCommand,
	GetDeckResponse
} from './deck.types';
import { fetchSuggestions } from '../api/fetch-suggestions';
import { fetchAddCard } from '../api/fetch-add-card';
import { fetchDeck } from '../api/fetch-deck';

export async function fetchSortedSuggestions(messageData: GetSuggestionsCommand): Promise<GetSuggestionsResponse> {
	const { payload, type: messageType } = messageData;
	const suggestionArray = await fetchSuggestions(payload);

	const deduped = new Set(suggestionArray);
	const dedupedArray = Array.from(deduped).sort();
	const front = [];
	const back = [];
	const testName = messageData.payload.toLowerCase();
	for (const name of dedupedArray) {
		if (name.toLowerCase().indexOf(testName) === 0) {
			front.push(name);
		} else {
			back.push(name);
		}
	}
	const sorted = front.concat(back);
	const result = {
		type: messageType,
		sorted: sorted,
		set: new Set(sorted.map((item) => item.toLowerCase()))
	};

	return result;
}

export async function fetchAddCardCommand(messageData: AddCardCommand): Promise<AddCardResponse> {
	const { cardName, type: messageType } = messageData;
	const result = await fetchAddCard('1', cardName);

	return {
		type: messageType
	};
}

export async function fetchSortedDeck(messageData: GetDeckCommand): Promise<GetDeckResponse> {
	const { deckId, type: messageType } = messageData;

	const data = await fetchDeck(deckId);

	const { cards } = data;

	const deck = {};
	for (const card of cards) {
		// TODO: multiple types.
		if (!(card.types in deck)) {
			deck[card.types] = [];
		}

		deck[card.types].push(card);
	}

	// Avoid duplicating the response.
	const response = data as GetDeckResponse;
	response.type = messageType;
	response.deck = deck;

	return response;
}

import type { FetchDeckResponse, FetchDeckCardResponse } from '../api/fetch-deck';

export type GetSuggestionsCommand = {
	type: 'suggest';
	payload: string;
};
export type GetSuggestionsResponse = {
	type: 'suggest';
	sorted: string[];
	set: Set<string>;
};

export type AddCardCommand = {
	type: 'add';
	cardName: string;
};
export type AddCardResponse = {
	type: 'add';
};

export type GetDeckCommand = {
	type: 'deck';
	deckId: string;
};
export type GetDeckResponse = FetchDeckResponse & {
	type: 'deck';
	deck: {
		[x: string]: FetchDeckCardResponse[];
	};
};

export type DeckWorkerCommand = GetSuggestionsCommand | AddCardCommand | GetDeckCommand;
export type DeckWorkerResponse = GetSuggestionsResponse | AddCardResponse | GetDeckResponse;

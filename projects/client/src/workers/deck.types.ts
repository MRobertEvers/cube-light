import type { FetchDeckResponse, FetchDeckCardResponse } from '../api/fetch-deck';
import { SetCardAction } from '../api/fetch-set-card';

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

export type SetCardCommand = {
	type: 'set';
	cardName: string;
	action: SetCardAction;
	count: number;
};

export type SetCardResponse = {
	type: 'set';
};

export type GetDeckCommand = {
	type: 'deck';
	deckId: string;
};

export type DeckGroupData = {
	count: number;
	cards: FetchDeckCardResponse[];
};
export type DeckMappedData = {
	count: number;
	cardCategories: {
		[x: string]: DeckGroupData;
	};
};
export type GetDeckResponse = FetchDeckResponse & {
	type: 'deck';
	deck: DeckMappedData;
};

export type DeckWorkerCommand = GetSuggestionsCommand | AddCardCommand | SetCardCommand | GetDeckCommand;
export type DeckWorkerResponse = GetSuggestionsResponse | AddCardResponse | SetCardResponse | GetDeckResponse;

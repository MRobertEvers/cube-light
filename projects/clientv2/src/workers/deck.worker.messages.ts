import { FetchAPIDeckCardResponse, FetchAPIDeckResponse } from '../api/fetch-api-deck';
import { SetCardAction } from '../api/fetch-api-set-card';
import { createMessage } from './utils/messageToolkit';

export type DeckGroupData = {
	count: number;
	cards: FetchAPIDeckCardResponse[];
};

export type DeckMappedData = {
	count: number;
	cardCategories: {
		[x: string]: DeckGroupData;
	};
};

export type GetDeckResponse = FetchAPIDeckResponse & { deck: DeckMappedData };

export const DeckWorkerMessages = {
	getSuggestions: createMessage<string, { sorted: string[]; set: Set<string> }>('getSuggestions'),
	addCard: createMessage<{ deckId: string; cardName: string; count: number }>('addCard'),
	setCard: createMessage<{
		deckId: string;
		cardName: string;
		action: SetCardAction;
		count: number;
	}>('setCard'),
	getDeck: createMessage<string, GetDeckResponse>('getDeck'),
	getLookupTree: createMessage<string[], any>('getLookupTree')
};

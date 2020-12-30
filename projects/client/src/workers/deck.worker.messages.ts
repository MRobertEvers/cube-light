import { FetchDeckCardResponse, FetchDeckResponse } from '../api/fetch-deck';
import { SetCardAction } from '../api/fetch-set-card';
import { createMessage } from './utils/workerToolkit';

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

export type GetDeckResponse = FetchDeckResponse & { deck: DeckMappedData };

export const DeckWorkerMessages = {
	getSuggestions: createMessage<string, { sorted: string[]; set: Set<string> }>('getSuggestions'),
	addCard: createMessage<string>('addCard'),
	setCard: createMessage<{ cardName: string; action: SetCardAction; count: number }>('setCard'),
	getDeck: createMessage<string, GetDeckResponse>('getDeck')
};

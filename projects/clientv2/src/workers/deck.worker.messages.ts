import {
	DeckBoard,
	FetchAPIDeckCardResponse,
	FetchAPIDeckResponse
} from '../api/fetch-api-deck';
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

export type GetDeckResponse = FetchAPIDeckResponse & {
	/** The main board, grouped. The same object as `boards.main`. */
	deck: DeckMappedData;
	/** Every board, grouped by card type. */
	boards: Record<DeckBoard, DeckMappedData>;
};

export const DeckWorkerMessages = {
	getSuggestions: createMessage<
		{ query: string; requestId: number },
		{
			query: string;
			requestId: number;
			sorted: string[];
			set: Set<string>;
			error?: boolean;
		}
	>('getSuggestions'),
	addCard: createMessage<
		{
			deckId: string;
			cardName: string;
			/** Copies for each board, saved together. */
			counts: Record<DeckBoard, number>;
		},
		boolean
	>('addCard'),
	setCard: createMessage<{
		deckId: string;
		cardName: string;
		action: SetCardAction;
		count: number;
	}>('setCard'),
	getDeck: createMessage<string, GetDeckResponse>('getDeck'),
	getLookupTree: createMessage<string[], any>('getLookupTree')
};

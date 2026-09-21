import {
	fetchSortedSuggestions,
	fetchAddCardCommand,
	fetchSetCardCommand,
	fetchSortedDeck
} from './deck.functions';
import { createHandler } from './utils/messageToolkit';
import { DeckWorkerMessages } from './deck.worker.messages';
import { createOnMessageHandler } from './utils/workerToolkit';
import { createNameLookupTree } from '../utils/lookup-tables/create-name-lookup-tree';

const handler = createHandler((builder) => {
	builder.addCase(DeckWorkerMessages.getSuggestions, async (message) => {
		const { query, requestId } = message.payload;
		try {
			return { ...(await fetchSortedSuggestions(query)), query, requestId };
		} catch {
			return { sorted: [], set: new Set<string>(), query, requestId, error: true };
		}
	});
	builder.addCase(DeckWorkerMessages.getDeck, async (message) => {
		const result = await fetchSortedDeck(message.payload);
		return result;
	});
	builder.addCase(DeckWorkerMessages.addCard, async (message) => {
		const { deckId, cardName, count } = message.payload;
		try {
			return await fetchAddCardCommand(deckId, cardName, count);
		} catch {
			return false;
		}
	});
	builder.addCase(DeckWorkerMessages.setCard, async (message) => {
		const { deckId, cardName, action, count } = message.payload;
		const result = await fetchSetCardCommand(deckId, cardName, action, count);
		return result;
	});
	builder.addCase(DeckWorkerMessages.getLookupTree, async (message) => {
		return createNameLookupTree(message.payload);
	});
	return builder;
});

onmessage = createOnMessageHandler(handler);

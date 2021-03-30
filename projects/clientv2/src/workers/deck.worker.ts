import {
	fetchSortedSuggestions,
	fetchAddCardCommand,
	fetchSetCardCommand,
	fetchSortedDeck
} from './deck.functions';
import { createHandler } from './utils/messageToolkit';
import { DeckWorkerMessages } from './deck.worker.messages';
import { createOnMessageHandler } from './utils/workerToolkit';
import { createNameLookupTree } from 'src/utils/lookup-tables/create-name-lookup-tree';

const handler = createHandler((builder) => {
	builder.addCase(DeckWorkerMessages.getSuggestions, async (message) => {
		const result = await fetchSortedSuggestions(message.payload);
		return result;
	});
	builder.addCase(DeckWorkerMessages.getDeck, async (message) => {
		const result = await fetchSortedDeck(message.payload);
		return result;
	});
	builder.addCase(DeckWorkerMessages.addCard, async (message) => {
		const { deckId, cardName, count } = message.payload;
		const result = await fetchAddCardCommand(deckId, cardName, count);
		return result;
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

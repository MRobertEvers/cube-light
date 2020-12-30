import {
	fetchSortedSuggestions,
	fetchAddCardCommand,
	fetchSetCardCommand,
	fetchSortedDeck
} from './deck.functions';
import { createHandler } from './utils/workerToolkit';
import { DeckWorkerMessages } from './deck.worker.messages';
import { createOnMessageHandler } from './utils/workerToolkitDefault';

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
		const result = await fetchAddCardCommand(message.payload);
		return result;
	});
	builder.addCase(DeckWorkerMessages.setCard, async (message) => {
		const { cardName, action, count } = message.payload;
		const result = await fetchSetCardCommand(cardName, action, count);
		return result;
	});
	return builder;
});

onmessage = createOnMessageHandler(handler);

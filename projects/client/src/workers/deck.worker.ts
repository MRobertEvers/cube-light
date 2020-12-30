import {
	AddCardCommand,
	GetSuggestionsCommand,
	DeckWorkerCommand,
	DeckWorkerResponse,
	GetDeckCommand,
	SetCardCommand
} from './deck.types';
import {
	fetchSortedSuggestions,
	fetchAddCardCommand,
	fetchSetCardCommand,
	fetchSortedDeck
} from './deck.functions';
import { createHandler, createMessage, createResponseHandler } from './utils/workerToolkit';

function postResult(result: DeckWorkerResponse) {
	postMessage(result);
}

const DeckWorkerMessages = {
	getSuggestions: createMessage<string, string>('getSuggestions')
};

const handler = createHandler((builder) => {
	builder.addCase(DeckWorkerMessages.getSuggestions, async (message) => {
		const result = await fetchSortedSuggestions(message.payload);
		postResult(result);
	});

	return builder;
});

const responseHandler = createResponseHandler((builder) => {
	builder.addCase(DeckWorkerMessages.getSuggestions, async (resp) => {
		resp.type;
	});
	return builder;
});

// This is the service worker entry point.
onmessage = async (event: MessageEvent) => {
	const message = event.data as DeckWorkerCommand;
	const messageType = message.type;

	switch (messageType) {
		case 'suggest':
			{
				const messageData = event.data as GetSuggestionsCommand;
				const result = await fetchSortedSuggestions(messageData);
				postResult(result);
			}
			break;
		case 'add':
			{
				const messageData = event.data as AddCardCommand;
				const result = await fetchAddCardCommand(messageData);
				postResult(result);
			}
			break;
		case 'set':
			{
				const messageData = event.data as SetCardCommand;
				const result = await fetchSetCardCommand(messageData);
				postResult(result);
			}
			break;
		case 'deck':
			{
				const messageData = event.data as GetDeckCommand;
				const result = await fetchSortedDeck(messageData);
				postResult(result);
			}
			break;
	}
};

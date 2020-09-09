import { AddCardCommand, GetSuggestionsCommand, DeckWorkerCommand } from './deck.types';
import { fetchSuggestions } from '../api/fetch-suggestions';
import { fetchAddCard } from '../api/fetch-add-card';

// This is the service worker entry point.
onmessage = async (event: MessageEvent) => {
	const message = event.data as DeckWorkerCommand;
	const messageType = message.type;
	if (messageType === 'suggest') {
		const messageData = event.data as GetSuggestionsCommand;

		const suggestionArray = await fetchSuggestions(messageData.payload);

		const deduped = new Set(suggestionArray);
		const dedupedArray = Array.from(deduped).sort();
		const front = [];
		const back = [];
		for (const name of dedupedArray) {
			if (name.toLowerCase().indexOf(messageData.payload) === 0) {
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

		postMessage(result);
	} else if (messageType === 'add') {
		const messageData = event.data as AddCardCommand;

		const ok = await fetchAddCard('1', messageData.cardName);
		postMessage({
			type: messageType
		});
	}
};

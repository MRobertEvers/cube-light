import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export type AddCardResponse = null;
export async function fetchAPIAddCard(deckId: string, cardName: string): Promise<AddCardResponse> {
	const request = await fetchTimeout(`${API_URI}/decks/${deckId}/cards`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: JSON.stringify({
			cardName: cardName
		})
	});

	return request.json() as Promise<AddCardResponse>;
}

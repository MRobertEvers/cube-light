import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export type AddCardResponse = boolean;
export async function fetchAPIAddCard(
	deckId: string,
	cardName: string,
	count: number
): Promise<AddCardResponse> {
	const request = await fetchTimeout(`${API_URI}/decks/${deckId}/cards`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: JSON.stringify({
			cardName: cardName,
			count: count
		})
	});

	return request.ok as AddCardResponse;
}

import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export type SetCardResponse = null;
export type SetCardAction = 'add' | 'remove' | 'set';
export async function fetchAPISetCard(
	deckId: string,
	cardName: string,
	action: SetCardAction,
	count: number
): Promise<SetCardResponse> {
	const request = await fetchTimeout(`${API_URI}/decks/${deckId}/cards`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: JSON.stringify({
			cardName: cardName,
			action: action,
			count: count
		})
	});

	return null;
}

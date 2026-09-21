import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchDeleteDeckResponse = {
	success: boolean;
};

export async function fetchAPIDeleteDeck(
	deckId: string
): Promise<FetchDeleteDeckResponse> {
	const fetchResult = await apiFetch(`${API_URI}/decks/${deckId}`, {
		method: 'DELETE'
	});

	return fetchResult.json() as Promise<FetchDeleteDeckResponse>;
}

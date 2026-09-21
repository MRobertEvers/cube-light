import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchCreateDeckResponse = {
	deckId: string;
};

export async function fetchAPICreateDeck(
	name: string
): Promise<FetchCreateDeckResponse> {
	const fetchResult = await apiFetch(`${API_URI}/decks`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name
		})
	});
	if (!fetchResult.ok) throw new Error('Could not create deck');

	return fetchResult.json() as Promise<FetchCreateDeckResponse>;
}

import { API_URI } from '../config/api-url';

export type FetchCreateDeckResponse = {
	deckId: number;
};

export async function fetchAPICreateDeck(name: string): Promise<FetchCreateDeckResponse> {
	const fetchResult = await fetch(`${API_URI}/decks`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name
		})
	});

	return fetchResult.json() as Promise<FetchCreateDeckResponse>;
}

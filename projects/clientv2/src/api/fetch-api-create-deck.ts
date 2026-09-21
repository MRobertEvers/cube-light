import { API_URI } from '../config/api-url';

export type FetchCreateDeckResponse = {
	deckId: string;
};

export async function fetchAPICreateDeck(
	name: string
): Promise<FetchCreateDeckResponse> {
	const fetchResult = await fetch(`${API_URI}/decks`, {
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

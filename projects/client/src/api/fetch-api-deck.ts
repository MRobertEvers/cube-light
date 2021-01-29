import { API_URI } from '../config/api-url';

export type FetchDeckCardResponse = {
	name: string;
	count: number;
	image: string;
	art: string;
	types: string;
	manaCost: string;
};
export type FetchDeckResponse = {
	name: string;
	icon: string;
	cards: FetchDeckCardResponse[];
};

export async function fetchAPIDeck(deckId: string): Promise<FetchDeckResponse> {
	const fetchResult = await fetch(`${API_URI}/decks/${deckId}`, {
		method: 'GET'
	});

	return fetchResult.json() as Promise<FetchDeckResponse>;
}

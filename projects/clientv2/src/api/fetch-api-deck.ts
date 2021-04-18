import { API_URI } from '../config/api-url';

export type FetchAPIDeckCardResponse = {
	name: string;
	count: number;
	image: string;
	uuid: string;
	art: string;
	types: string;
	manaCost: string;
};

export type FetchAPIDeckResponse = {
	name: string;
	icon: string;
	cards: FetchAPIDeckCardResponse[];
	lastEdit: string;
};

export async function fetchAPIDeck(deckId: string): Promise<FetchAPIDeckResponse> {
	const fetchResult = await fetch(`${API_URI}/decks/${deckId}`, {
		method: 'GET'
	});

	return fetchResult.json() as Promise<FetchAPIDeckResponse>;
}

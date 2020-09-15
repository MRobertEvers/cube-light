import { API_URI } from '../config/api-url';

export type FetchDecksDeckResponse = {
	deckId: number;
	name: string;
};
export type FetchDecksResponse = Array<FetchDecksDeckResponse>;

export async function fetchDecks(pageStart: number = 0, pageSize: number = 15): Promise<FetchDecksResponse> {
	const q = new URLSearchParams();
	if (pageStart > 0) {
		q.set('pageStart', pageStart.toString());
		if (pageSize > 0) {
			q.set('pageSize', pageSize.toString());
		}
	}

	const API_CALL = `${API_URI}/decks?${q.toString()}`;
	const API_OPTIONS: RequestInit = {
		method: 'GET' as 'GET'
	};

	const fetchResult = await fetch(API_CALL, API_OPTIONS);
	return fetchResult.json() as Promise<FetchDecksResponse>;
}

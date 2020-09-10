import { xhrFetch } from './xhr-fetch';
import { API_URI } from '../config/api-url';

export type FetchDeckCardResponse = { name: string; count: string; image: string; types: string };
export type FetchDeckResponse = {
	name: string;
	icon: string;
	cards: FetchDeckCardResponse[];
};

export async function fetchDeck(deckId: string): Promise<FetchDeckResponse> {
	const API_CALL = `${API_URI}/deck/${deckId}`;
	const API_OPTIONS = {
		method: 'GET' as 'GET'
	};

	// API calls that are called in SSR must use fetch.
	if (typeof XMLHttpRequest === 'undefined') {
		const fetchResult = await fetch(API_CALL, API_OPTIONS);
		return fetchResult.json() as Promise<FetchDeckResponse>;
	}

	return new Promise((resolve, reject) => {
		xhrFetch(API_CALL, API_OPTIONS, (xhr: XMLHttpRequest) => {
			const state = xhr.readyState;
			switch (state) {
				case XMLHttpRequest.OPENED:
					break;
				case XMLHttpRequest.HEADERS_RECEIVED:
					break;
				case XMLHttpRequest.LOADING:
					break;
				case XMLHttpRequest.DONE:
					resolve(JSON.parse(xhr.responseText));
					break;
			}
		});
	});
}

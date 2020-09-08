import { xhrFetch } from './xhr-fetch';

export type SuggestionsResponse = string[];
export async function fetchSuggestions(name: string): Promise<SuggestionsResponse> {
	return new Promise((resolve, reject) => {
		xhrFetch(
			`http://localhost:4040/suggest?stub=${name}`,
			{
				method: 'GET'
			},
			(xhr: XMLHttpRequest) => {
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
			}
		);
	});
}

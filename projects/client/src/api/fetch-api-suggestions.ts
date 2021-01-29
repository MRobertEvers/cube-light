import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export type SuggestionsResponse = string[];
export async function fetchAPISuggestions(name: string): Promise<SuggestionsResponse> {
	const request = await fetchTimeout(`${API_URI}/suggest?stub=${name}`, {
		method: 'GET'
	});

	return request.json() as Promise<SuggestionsResponse>;
}

import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchCreateCollectionResponse = {
	collection_id: string;
};

export async function fetchAPICreateCollection(
	name: string
): Promise<FetchCreateCollectionResponse> {
	const fetchResult = await apiFetch(`${API_URI}/collection`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name
		})
	});

	return fetchResult.json() as Promise<FetchCreateCollectionResponse>;
}

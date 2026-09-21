import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchCreateStorageLocationResponse = {
	storage_location_id: string;
};

export async function fetchAPICreateStorageLocation(
	name: string
): Promise<FetchCreateStorageLocationResponse> {
	const fetchResult = await apiFetch(`${API_URI}/storage-location`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			name: name
		})
	});

	return fetchResult.json() as Promise<FetchCreateStorageLocationResponse>;
}

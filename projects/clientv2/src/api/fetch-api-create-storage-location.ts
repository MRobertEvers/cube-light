import { API_URI } from '../config/api-url';

export type FetchCreateStorageLocationResponse = {
	storage_location_id: string;
};

export async function fetchAPICreateStorageLocation(
	name: string
): Promise<FetchCreateStorageLocationResponse> {
	const fetchResult = await fetch(`${API_URI}/storage-location`, {
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

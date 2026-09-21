import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchStorageLocationsLocationResponse = {
	storage_location_id: string;
	name: string;
};
export type FetchStorageLocationsResponse =
	Array<FetchStorageLocationsLocationResponse>;

export async function fetchAPIStorageLocations(
	pageStart: number = 0,
	pageSize: number = 15
): Promise<FetchStorageLocationsResponse> {
	const q = new URLSearchParams();
	if (pageStart > 0) {
		q.set('page-token', pageStart.toString());
		if (pageSize > 0) {
			q.set('limit', pageSize.toString());
		}
	}

	const response = await apiFetch(
		`${API_URI}/storage-location/search?${q.toString()}`,
		{
			method: 'GET'
		}
	);

	return response.json() as Promise<FetchStorageLocationsResponse>;
}

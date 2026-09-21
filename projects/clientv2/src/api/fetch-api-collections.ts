import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type FetchCollectionsCollectionResponse = {
	collection_id: string;
	name: string;
};
export type FetchCollectionsResponse =
	Array<FetchCollectionsCollectionResponse>;

export async function fetchAPICollections(
	pageStart: number = 0,
	pageSize: number = 15
): Promise<FetchCollectionsResponse> {
	const q = new URLSearchParams();
	if (pageStart > 0) {
		q.set('page-token', pageStart.toString());
		if (pageSize > 0) {
			q.set('limit', pageSize.toString());
		}
	}

	const response = await apiFetch(
		`${API_URI}/collection/search?${q.toString()}`,
		{
			method: 'GET'
		}
	);

	return response.json() as Promise<FetchCollectionsResponse>;
}

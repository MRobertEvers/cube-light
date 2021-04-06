import { API_URI } from 'src/config/api-url';
import { fetchTimeout } from './utils';

export type FetchAPICardDetailsResponse = {
	// From DetailedCardInfo
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	subtypes: string;
	manaCost: string; // {X}{W}
	text: string;
	setCode: string;

	sets: Array<[string, string]>;

	// From Scryfall;
	image: string | null;
	highResImage: string | null;
	art: string | null;
};

export async function fetchAPICardDetails(uuid: string): Promise<FetchAPICardDetailsResponse> {
	const query = new URLSearchParams();
	query.set('uuid', uuid);

	const request = await fetchTimeout(`${API_URI}/cards/details?${query.toString()}`, {
		method: 'GET'
	});

	return request.json();
}

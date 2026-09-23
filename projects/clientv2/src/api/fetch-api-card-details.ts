import { API_URI } from 'src/config/api-url';
import { fetchTimeout } from './utils';

export type CardPreviewDetails = {
	text: string;
	type: string | null;
	rarity: string | null;
	power: string | null;
	toughness: string | null;
	loyalty: string | null;
	defense: string | null;
	number: string | null;
	artist: string | null;
	flavorText: string | null;
	legalities: Record<string, string>; // format -> Legal/Banned/Restricted
};

export type FetchAPICardDetailsResponse = CardPreviewDetails & {
	// From DetailedCardInfo
	name: string;
	uuid: string;
	scryfallId: string;
	types: string; // Comma separated types above.
	subtypes: string;
	manaCost: string; // {X}{W}
	setCode: string;

	/** Absent when answered offline from a synced deck overview, which does not list sets. */
	sets?: Array<[string, string]>;

	// From Scryfall;
	image: string | null;
	highResImage: string | null;
	art: string | null;
};

export async function fetchAPICardDetails(
	uuid: string
): Promise<FetchAPICardDetailsResponse> {
	const query = new URLSearchParams();
	query.set('uuid', uuid);

	const request = await fetchTimeout(
		`${API_URI}/cards/details?${query.toString()}`,
		{
			method: 'GET'
		}
	);

	return request.json();
}

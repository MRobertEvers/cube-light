import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type DeckHistoryCard = {
	uuid: string;
	name: string | null;
	count: number;
};
export type DeckHistoryDetail = {
	field:
		| 'name'
		| 'bannerCardUuid'
		| 'art'
		| 'palette'
		| 'bannerCrop'
		| 'topStyle'
		| 'bannerBlend';
	before: string | null;
	after: string | null;
};
export type DeckHistoryEdit = {
	id: number;
	createdAt: string;
	cardsIn: DeckHistoryCard[];
	cardsOut: DeckHistoryCard[];
	details: DeckHistoryDetail[];
};
export type DeckHistoryResponse = {
	deckId: string;
	deckName: string;
	edits: DeckHistoryEdit[];
};

export async function fetchAPIDeckHistory(
	deckId: string
): Promise<DeckHistoryResponse> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}/history`);
	if (!response.ok)
		throw new Error(`Could not load deck history (${response.status})`);
	return response.json() as Promise<DeckHistoryResponse>;
}

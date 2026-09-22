import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';
import type { CardPalette } from '../utils/card-palette';
import type { BannerCrop } from '../utils/banner-crop';
import type { DeckTopStyle } from '../utils/deck-top-style';
import type { BannerBlend } from '../utils/banner-blend';
import type { CardPreviewDetails } from './fetch-api-card-details';

export type FetchAPIDeckCardResponse = CardPreviewDetails & {
	name: string;
	count: number;
	image: string;
	images?: {
		small: string;
		normal: string;
		large: string;
		art_crop: string;
	};
	uuid: string;
	art: string;
	setCode: string;
	types: string;
	manaCost: string;
};

export type FetchAPIDeckResponse = {
	name: string;
	icon: string | null;
	bannerCardUuid: string | null;
	bannerCard: {
		name: string;
		uuid: string;
		setCode: string;
		art: string | null;
	} | null;
	palette: CardPalette | null;
	bannerCrop: BannerCrop | null;
	bannerBlend?: BannerBlend | null;
	topStyle: DeckTopStyle;
	cards: FetchAPIDeckCardResponse[];
	lastEdit: string;
};

export async function fetchAPIDeck(
	deckId: string
): Promise<FetchAPIDeckResponse> {
	const fetchResult = await apiFetch(`${API_URI}/decks/${deckId}`, {
		method: 'GET'
	});

	return fetchResult.json() as Promise<FetchAPIDeckResponse>;
}

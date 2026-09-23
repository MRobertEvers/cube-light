import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';
import type { CardPalette } from '../utils/card-palette';
import type { BannerCrop } from '../utils/banner-crop';
import type { DeckTopStyle } from '../utils/deck-top-style';
import type { BannerBlend } from '../utils/banner-blend';
import type { CardPreviewDetails } from './fetch-api-card-details';
import type { DeckBoard } from '@torimtg/core';

export type { DeckBoard };

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
	/** Comma separated, e.g. "Human, Soldier". Missing for cards not yet described on this device. */
	subtypes?: string;
	manaCost: string;
	/** The board this entry is counted in. The same printing can sit in both boards. */
	board: DeckBoard;
};

export type DeckNote = {
	noteId: string;
	text: string;
	createdAt: string;
	updatedAt: string;
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
	/** A BoardVisualization id. Absent until the deck chooses one. */
	boardVisualization?: string | null;
	/** Main-board entries, one per printing. */
	cards: FetchAPIDeckCardResponse[];
	/** Side-board entries, one per printing. Missing from decks saved before boards existed. */
	sideboard?: FetchAPIDeckCardResponse[];
	/** Most recently edited first. */
	notes?: DeckNote[];
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

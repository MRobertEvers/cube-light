import type { CardPalette } from '../appearance/card-palette';
import type { BannerCrop } from '../appearance/banner-crop';
import type { DeckTopStyle } from '../appearance/deck-top-style';
import type { BannerBlend } from '../appearance/banner-blend';
import type { CardPreviewDetails } from './card';
import type { DeckColor } from '../deck/deck-colors';
import type { DeckBoard, DeckGroup } from '@torimtg/core';

export type { DeckBoard, DeckGroup };

export type DeckCardEntry = CardPreviewDetails & {
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

export type DeckDetail = {
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
	cards: DeckCardEntry[];
	/** Side-board entries, one per printing. Missing from decks saved before boards existed. */
	sideboard?: DeckCardEntry[];
	/** Most recently edited first. */
	notes?: DeckNote[];
	/** In the order they were given. Missing from decks read before tags existed. */
	tags?: string[];
	lastEdit: string;
};

export type DeckSummary = {
	deckId: string;
	name: string;
	art: string | null;
	bannerBlend?: BannerBlend | null;
	/** Every color in a main-board card's mana cost, in WUBRG order. */
	colors: DeckColor[];
	tags: string[];
	createdAt: string;
	updatedAt: string;
};
export type DeckSummaries = Array<DeckSummary>;

export type DeckHistoryCard = {
	uuid: string;
	name: string | null;
	count: number;
	/** Missing from edits made before boards existed, which were all main-board edits. */
	board?: DeckBoard;
};
export type DeckHistoryDetail = {
	field:
		| 'name'
		| 'bannerCardUuid'
		| 'art'
		| 'palette'
		| 'bannerCrop'
		| 'topStyle'
		| 'boardVisualization'
		| 'bannerBlend'
		| 'note'
		| 'tags';
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
export type DeckHistory = {
	deckId: string;
	deckName: string;
	edits: DeckHistoryEdit[];
};

export type DeckCardsMove = {
	from: DeckBoard;
	to: DeckBoard;
	/** Copies of each printing to take out of `from` and put into `to`. */
	cards: Array<{ uuid: string; count: number }>;
};

/** A card to add by name. `board` defaults to the main board. */
export type ImportedCard = {
	name: string;
	count: number;
	setCode?: string;
	board?: DeckBoard;
};

export class ImportCardsError extends Error {
	readonly unknownCards: string[];

	constructor(message: string, unknownCardsArg?: string[]) {
		const unknownCards =
			unknownCardsArg === undefined ? [] : unknownCardsArg;

		super(message);
		this.unknownCards = unknownCards;
	}
}

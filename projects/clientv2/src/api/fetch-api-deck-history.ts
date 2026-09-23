import type { DeckBoard } from '@torimtg/core';

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
		| 'note';
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

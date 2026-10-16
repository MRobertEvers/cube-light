/** Where on a photo a card name was read. */
export type ImageRegion = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/**
 * What a scanned image shows: cards (physical, or card images such as Arena's)
 * where every title read is one copy, or a deck list whose lines carry counts.
 */
export type ImageScanLayout = 'cards' | 'list';

/** A title read off one card: one copy. */
export type CardTitleCandidate = {
	source: 'card-title';
	name: string;
	text: string;
	score: number;
	box: ImageRegion;
};

/** A deck-list line: a name and the count written before or after it. */
export type ListLineCandidate = {
	source: 'list-line';
	name: string;
	text: string;
	score: number;
	box: ImageRegion;
	/** 1 when the line shows no readable count. */
	count: number;
};

export type CardImageCandidate = CardTitleCandidate | ListLineCandidate;

/** How many copies of the card a candidate stands for. */
export function copiesOf(candidate: CardImageCandidate): number {
	return candidate.source === 'list-line' ? candidate.count : 1;
}

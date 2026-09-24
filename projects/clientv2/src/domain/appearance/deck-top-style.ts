import type { DeckDetail } from '../models/deck';

export type DeckTopStyle = 'card' | 'full-art';

/**
 * The top the deck page shows. Decks saved before the full-art top existed may
 * hold anything here, and a deck with no card art (an empty one) has nothing
 * to show full-art, so both fall back to the card top.
 */
export function deckTopStyle(deck: DeckDetail): DeckTopStyle {
	return deck.topStyle === 'full-art' && !!deckTopBannerCard(deck)?.art
		? 'full-art'
		: 'card';
}

/** The chosen banner card, or else the first card with art. */
export function deckTopBannerCard(
	deck: DeckDetail
): { name: string; art: string | null } | undefined {
	const bannerCards = deck.cards.filter((card) => !!card.art);
	return (
		deck.bannerCard ??
		bannerCards.find((card) => card.uuid === deck.bannerCardUuid) ??
		bannerCards[0]
	);
}

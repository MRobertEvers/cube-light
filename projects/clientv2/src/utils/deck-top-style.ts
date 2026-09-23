import type { FetchAPIDeckResponse } from '../api/fetch-api-deck';

export type DeckTopStyle = 'card' | 'full-art';

/** Decks saved before the full-art top existed may hold anything here. */
export function deckTopStyle(deck: FetchAPIDeckResponse): DeckTopStyle {
	return deck.topStyle === 'full-art' ? 'full-art' : 'card';
}

/** The chosen banner card, or else the first card with art. */
export function deckTopBannerCard(
	deck: FetchAPIDeckResponse
): { name: string; art: string | null } | undefined {
	const bannerCards = deck.cards.filter((card) => !!card.art);
	return (
		deck.bannerCard ??
		bannerCards.find((card) => card.uuid === deck.bannerCardUuid) ??
		bannerCards[0]
	);
}

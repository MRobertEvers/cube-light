import type { DeckCardEntry } from '../../../domain/models/deck';
import type { RenderedCardFace } from '../../kit/components/RenderedCard/RenderedCard';

/** The printing's art crop URL: ShellWorker answers it offline from its image cache once shown online. */
export function cardArtUrl(card: DeckCardEntry): string | null {
	return card.images?.art_crop || card.art || null;
}

/**
 * The art a rendered card shows, from useOfflineCardArt's answer: the art pack's image,
 * else the printing's URL for ShellWorker's cache; nothing while the pack is still read.
 */
export function offlineArt(card: DeckCardEntry, packArt: string | null | undefined): string | null {
	if (packArt === undefined) return null;
	return packArt ?? cardArtUrl(card);
}

/** A deck entry as a card to draw, with `art` as its art's URL. */
export function renderedFace(card: DeckCardEntry, art: string | null): RenderedCardFace {
	return {
		name: card.name,
		manaCost: card.manaCost || null,
		type: card.type ?? null,
		text: card.text || null,
		flavorText: card.flavorText ?? null,
		power: card.power ?? null,
		toughness: card.toughness ?? null,
		loyalty: card.loyalty ?? null,
		defense: card.defense ?? null,
		setCode: card.setCode || null,
		rarity: card.rarity ?? null,
		number: card.number ?? null,
		artist: card.artist ?? null,
		art: art
	};
}

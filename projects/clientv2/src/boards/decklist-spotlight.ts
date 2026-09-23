import type { BannerBlend } from '../utils/banner-blend';
import { type BannerCrop, DEFAULT_BANNER_CROP } from '../utils/banner-crop';
import {
	type DeckTopStyle,
	deckTopBannerCard,
	deckTopStyle
} from '../utils/deck-top-style';
import type { GetDeckResponse } from '../workers/deck.worker.messages';

/** The spotlight card the decklist boards show above their rows. */
export type DecklistSpotlightProps = {
	banner: { art: string | null; name: string } | null;
	bannerCrop: BannerCrop;
	bannerBlend?: BannerBlend | null;
	/** A full-art top already shows the banner, so the spotlight is hidden. */
	topStyle: DeckTopStyle;
};

export function decklistSpotlight(deck: GetDeckResponse): DecklistSpotlightProps {
	const banner = deckTopBannerCard(deck);
	return {
		banner: banner ? { art: banner.art, name: banner.name } : null,
		bannerCrop: deck.bannerCrop ?? DEFAULT_BANNER_CROP,
		bannerBlend: deck.bannerBlend,
		topStyle: deckTopStyle(deck)
	};
}

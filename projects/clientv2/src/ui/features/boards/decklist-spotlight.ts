import type { BannerBlend } from '../../../domain/appearance/banner-blend';
import { type ArtworkInfo, artworkOf } from '../../../domain/appearance/artwork';
import {
	type BannerCrop,
	DEFAULT_BANNER_CROP
} from '../../../domain/appearance/banner-crop';
import {
	type DeckTopStyle,
	deckTopBannerCard,
	deckTopStyle
} from '../../../domain/appearance/deck-top-style';
import type { GroupedDeck } from '../../../domain/deck/grouping';

/** The spotlight card the decklist boards show above their rows. */
export type DecklistSpotlightProps = {
	banner: { art: string | null; artInfo: ArtworkInfo | null; name: string } | null;
	bannerCrop: BannerCrop;
	bannerBlend?: BannerBlend | null;
	/** A full-art top already shows the banner, so the spotlight is hidden. */
	topStyle: DeckTopStyle;
};

export function decklistSpotlight(deck: GroupedDeck): DecklistSpotlightProps {
	const banner = deckTopBannerCard(deck);
	return {
		banner: banner
			? { art: banner.art, artInfo: artworkOf(deck.artwork, banner.art), name: banner.name }
			: null,
		bannerCrop: deck.bannerCrop ?? DEFAULT_BANNER_CROP,
		bannerBlend: deck.bannerBlend,
		topStyle: deckTopStyle(deck)
	};
}

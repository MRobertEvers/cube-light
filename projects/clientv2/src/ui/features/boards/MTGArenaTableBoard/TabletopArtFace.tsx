import React from 'react';
import type { DeckCardEntry } from '../../../../domain/models/deck';
import { RenderedCard } from '../../../kit/components/RenderedCard/RenderedCard';
import { useOfflineCardArt } from '../../../kit/hooks/useOfflineCardArt';
import { offlineArt, renderedFace } from '../../CardPreviewer/rendered-face';

/**
 * A tabletop card drawn from its text around its art from the offline art pack, where
 * online shows the card's image: a stacked card's band shows its name, cost and the top
 * of the art, as the image does. The board draws copies and ownership over it.
 */
export function TabletopArtFace(props: { card: DeckCardEntry }) {
	const { card } = props;
	const art = useOfflineCardArt(card);
	return <RenderedCard face={renderedFace(card, offlineArt(card, art))} />;
}

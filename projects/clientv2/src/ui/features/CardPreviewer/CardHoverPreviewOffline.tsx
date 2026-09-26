import React from 'react';
import { RenderedCard } from '../../kit/components/RenderedCard/RenderedCard';
import type { CardHoverPreviewProps } from './card-previewer.types';
import { cardArtUrl, renderedFace } from './rendered-face';

import styles from './card-previewer.module.css';

/** The card drawn from its text and stored art, shown beside the row under the pointer: its image needs the server. */
export function CardHoverPreviewOffline(props: CardHoverPreviewProps) {
	const { card } = props;
	return <RenderedCard face={renderedFace(card, cardArtUrl(card))} className={styles['hover-rendered']} />;
}

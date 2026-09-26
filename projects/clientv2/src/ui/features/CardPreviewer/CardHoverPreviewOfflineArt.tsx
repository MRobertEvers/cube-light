import React from 'react';
import { RenderedCard } from '../../kit/components/RenderedCard/RenderedCard';
import { useOfflineCardArt } from '../../kit/hooks/useOfflineCardArt';
import type { CardHoverPreviewProps } from './card-previewer.types';
import { offlineArt, renderedFace } from './rendered-face';

import styles from './card-previewer.module.css';

/** The card drawn from its text around its art from the offline art pack, shown beside the row under the pointer. */
export function CardHoverPreviewOfflineArt(props: CardHoverPreviewProps) {
	const { card } = props;
	const art = useOfflineCardArt(card);
	return <RenderedCard face={renderedFace(card, offlineArt(card, art))} className={styles['hover-rendered']} />;
}

import React from 'react';
import type { CardHoverPreviewProps } from './card-previewer.types';

import styles from './card-previewer.module.css';

/** The card's image, shown beside the row under the pointer. */
export function CardHoverPreviewOnline(props: CardHoverPreviewProps) {
	const { card } = props;
	return <img className={styles['hover-image']} src={card.images?.normal ?? card.image} alt="" />;
}

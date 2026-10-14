import React from 'react';
import type { CardHoverPreviewProps } from './card-previewer.types';

import styles from './card-previewer.module.css';

/** The card's image, shown beside the row under the pointer: a double-faced card's two faces side by side. */
export function CardHoverPreviewOnline(props: CardHoverPreviewProps) {
	const { card } = props;
	const front = card.images?.normal ?? card.image;
	if (!card.backImages) return <img className={styles['hover-image']} src={front} alt="" />;
	return (
		<span className={styles['hover-faces']}>
			<img className={styles['hover-image']} src={front} alt="" />
			<img className={styles['hover-image']} src={card.backImages.normal} alt="" />
		</span>
	);
}

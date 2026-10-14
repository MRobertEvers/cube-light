import React from 'react';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { ViewArtButton } from 'src/ui/kit/components/BannerArtwork/ViewArtButton';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerTitle } from './CardPreviewerTitle';
import { CardRulesText } from './CardRulesText';

import styles from './card-previewer.module.css';

/** A dialog with a large image of one printing beside its rules text. */
export function CardPreviewerDesktopOnline(props: CardPreviewerProps) {
	const { card, onClose } = props;
	useCloseOnEscape(onClose);

	return (
		<section className={styles['desktop']} role="dialog" aria-modal="true" aria-labelledby="card-previewer-title">
			<header className={styles['header']}>
				<CardPreviewerTitle card={card} />
				<button className={styles['close']} type="button" aria-label="Close card preview" onClick={onClose}>
					×
				</button>
			</header>
			<div className={styles['desktop-body']}>
				<div className={styles['desktop-image']}>
					<span className={styles['image-frame']}>
						<img src={card.images?.normal ?? card.image} alt={`${card.name}, ${card.setCode} printing`} />
						<ViewArtButton image={card.images?.art_crop ?? card.art} placement="card" />
					</span>
				</div>
				<CardRulesText key={card.uuid} details={card} className={styles['desktop-details']} />
			</div>
		</section>
	);
}

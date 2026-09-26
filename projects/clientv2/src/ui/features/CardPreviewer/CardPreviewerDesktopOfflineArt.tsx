import React from 'react';
import { RenderedCard } from 'src/ui/kit/components/RenderedCard/RenderedCard';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { useOfflineCardArt } from 'src/ui/kit/hooks/useOfflineCardArt';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerTitle } from './CardPreviewerTitle';
import { CardRulesText } from './CardRulesText';
import { offlineArt, renderedFace } from './rendered-face';

import styles from './card-previewer.module.css';

/**
 * A dialog with the card drawn from its text around its art from the offline art pack,
 * beside one printing's rules text, where online shows the card's image.
 */
export function CardPreviewerDesktopOfflineArt(props: CardPreviewerProps) {
	const { card, onClose } = props;
	const art = useOfflineCardArt(card);
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
					<RenderedCard face={renderedFace(card, offlineArt(card, art))} className={styles['rendered']} />
				</div>
				<CardRulesText key={card.uuid} details={card} className={styles['desktop-details']} />
			</div>
		</section>
	);
}

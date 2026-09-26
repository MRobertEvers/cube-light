import React from 'react';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { RenderedCard } from 'src/ui/kit/components/RenderedCard/RenderedCard';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { useOfflineCardArt } from 'src/ui/kit/hooks/useOfflineCardArt';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerTitle } from './CardPreviewerTitle';
import { CardRulesText } from './CardRulesText';
import { offlineArt, renderedFace } from './rendered-face';

import styles from './card-previewer.module.css';

/**
 * A full-screen page with the card drawn from its text around its art from the offline
 * art pack, above one printing's rules text, where online shows the card's image. Back closes it.
 */
export function CardPreviewerMobileOfflineArt(props: CardPreviewerProps) {
	const { card, onClose } = props;
	const art = useOfflineCardArt(card);
	useCloseOnEscape(onClose);

	return (
		<section className={styles['mobile']} role="dialog" aria-modal="true" aria-labelledby="card-previewer-title">
			<header className={styles['mobile-header']}>
				<HeaderBackSlot>
					<HeaderBackButton inline label="Close card preview" onClick={onClose} />
				</HeaderBackSlot>
				<CardPreviewerTitle card={card} />
			</header>
			<div className={styles['mobile-body']}>
				<div className={styles['mobile-image']}>
					<RenderedCard face={renderedFace(card, offlineArt(card, art))} className={styles['rendered']} />
				</div>
				<CardRulesText key={card.uuid} details={card} className={styles['mobile-details']} />
			</div>
		</section>
	);
}

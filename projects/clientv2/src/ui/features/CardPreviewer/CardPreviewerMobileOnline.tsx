import React from 'react';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';
import { CardFaceImage } from './CardFaceImage';
import type { CardPreviewerProps } from './card-previewer.types';
import { CardPreviewerTitle } from './CardPreviewerTitle';
import { CardRulesText } from './CardRulesText';

import styles from './card-previewer.module.css';

/** A full-screen page with one printing's image above its rules text; back closes it. */
export function CardPreviewerMobileOnline(props: CardPreviewerProps) {
	const { card, onClose } = props;
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
					<CardFaceImage key={card.uuid} card={card} />
				</div>
				<CardRulesText key={card.uuid} details={card} className={styles['mobile-details']} />
			</div>
		</section>
	);
}

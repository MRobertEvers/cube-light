import React, { useState } from 'react';
import { ViewArtButton } from 'src/ui/kit/components/BannerArtwork/ViewArtButton';
import type { DeckCardEntry } from '../../../domain/models/deck';

import styles from './card-previewer.module.css';

/**
 * One printing's image in the card preview, with the button that opens its art. A double-faced
 * card (transform, modal) also has a Flip button at the bottom, which turns it over. Give it a
 * `key` of the card, so another card opens on its front.
 */
export function CardFaceImage(props: { card: DeckCardEntry }) {
	const { card } = props;
	const [back, setBack] = useState(false);
	const backImages = card.backImages;
	const showBack = back && !!backImages;
	const src = showBack && backImages ? backImages.normal : (card.images?.normal ?? card.image);
	const art = showBack && backImages ? backImages.art_crop : (card.images?.art_crop ?? card.art);
	return (
		<span className={`${styles['image-frame']}${backImages ? ` ${styles['two-faced']}` : ''}`}>
			<img
				// A new image per face, so turning the card over plays its flip.
				key={showBack ? 'back' : 'front'}
				className={backImages ? styles['face-turned'] : undefined}
				src={src}
				alt={`${card.name}, ${card.setCode} printing${backImages ? (showBack ? ', back face' : ', front face') : ''}`}
			/>
			<ViewArtButton image={art} placement="card" />
			{backImages && (
				<button
					type="button"
					className={styles.flip}
					aria-pressed={showBack}
					aria-label={showBack ? 'Show the front face' : 'Show the back face'}
					onClick={() => setBack(!back)}
				>
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
						<path d="M21 3v5h-5" />
						<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
						<path d="M3 21v-5h5" />
					</svg>
					Flip
				</button>
			)}
		</span>
	);
}

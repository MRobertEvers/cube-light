import React from 'react';
import type { DeckCardEntry } from '../../../domain/models/deck';
import { ManaCost } from '../../kit/components/ManaCost/ManaCost';

import styles from './card-previewer.module.css';

/** The card's name and mana cost, and how many copies of which printing. */
export function CardPreviewerTitle(props: { card: DeckCardEntry }) {
	const { card } = props;
	return (
		<div className={styles['title']}>
			<h2 id="card-previewer-title">
				{card.name}
				{card.manaCost && (
					<span className={styles['cost']}>
						<ManaCost cost={card.manaCost} />
					</span>
				)}
			</h2>
			<p>
				{card.count} × {card.setCode} printing
			</p>
		</div>
	);
}

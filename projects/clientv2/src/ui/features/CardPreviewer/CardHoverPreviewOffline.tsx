import React from 'react';
import { ManaCost, ManaText } from '../../kit/components/ManaCost/ManaCost';
import type { CardHoverPreviewProps } from './card-previewer.types';
import { cardStats } from './CardRulesText';

import styles from './card-previewer.module.css';

/** The card as text, shown beside the row under the pointer: its image needs the server. */
export function CardHoverPreviewOffline(props: CardHoverPreviewProps) {
	const { card } = props;
	const stats = cardStats(card);
	return (
		<div className={styles['hover-text']}>
			<p className={styles['hover-name']}>
				<span>{card.name}</span>
				{card.manaCost && (
					<span className={styles['cost']}>
						<ManaCost cost={card.manaCost} />
					</span>
				)}
			</p>
			{card.type && <p className={styles['hover-type']}>{card.type}</p>}
			{card.text && (
				<div className={styles['hover-rules']}>
					{card.text.split('\n').map((line, i) => (
						<p key={i}>
							<ManaText text={line} />
						</p>
					))}
				</div>
			)}
			{stats && <p className={styles['hover-stats']}>{stats}</p>}
		</div>
	);
}

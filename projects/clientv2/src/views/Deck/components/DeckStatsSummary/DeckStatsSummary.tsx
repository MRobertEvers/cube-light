import React from 'react';
import { GetDeckResponse } from '../../../../workers/deck.worker.messages';

import styles from './deck-stats-summary.module.css';

interface DeckStatsSummaryProps {
	deck: GetDeckResponse;
}
export function DeckStatsSummary(props: DeckStatsSummaryProps) {
	const { deck } = props;

	return (
		<div className={styles['deck-stats-summary-container']}>
			<span className={styles['item']}>
				<span className={styles['focus-item']}>{deck.deck.count} </span>
				cards
			</span>
			<span className={styles['item']}>
				<span className={styles['focus-item']}>8 </span>
				likes
			</span>
		</div>
	);
}

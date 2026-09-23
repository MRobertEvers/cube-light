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
				{deck.deck.count === 1 ? 'card' : 'cards'}
			</span>
			{deck.boards.side.count > 0 && (
				<span className={styles['item']}>
					<span className={styles['focus-item']}>
						{deck.boards.side.count}{' '}
					</span>
					in sideboard
				</span>
			)}
		</div>
	);
}

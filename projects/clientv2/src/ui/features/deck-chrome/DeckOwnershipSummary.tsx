import React from 'react';
import type { DeckOwnershipSummary as Summary } from '../../../domain/library/ownership';
import type { OwnershipFilter } from '../boards/board.types';

import styles from './deck-ownership-summary.module.css';

const FILTERS: ReadonlyArray<{ filter: OwnershipFilter; label: string }> = [
	{ filter: 'all', label: 'All' },
	{ filter: 'owned', label: 'Owned' },
	{ filter: 'missing', label: 'Missing' }
];

type DeckOwnershipSummaryProps = {
	/** Null until the library has been read. */
	summary: Summary | null;
	filter: OwnershipFilter;
	onFilter: (filter: OwnershipFilter) => void;
	onAddMissing: () => void;
	/** One line, for the toolbar above a full-width board. */
	compact?: boolean;
};

/** How much of the deck the owned collections cover, a filter by it, and a way to want the rest. */
export function DeckOwnershipSummary(props: DeckOwnershipSummaryProps) {
	const { summary, filter, onFilter, onAddMissing, compact } = props;
	if (!summary || summary.totalCopies === 0) return null;
	const missingNames = summary.partialNames + summary.missingNames;
	return (
		<section
			className={compact ? `${styles.summary} ${styles.compact}` : styles.summary}
			aria-label="Cards you own"
		>
			<p className={styles.totals}>
				<strong>
					{summary.ownedCopies} of {summary.totalCopies}
				</strong>{' '}
				owned
				{missingNames > 0 && (
					<span className={styles.detail}>
						{summary.partialNames > 0 && ` · ${summary.partialNames} partial`}
						{summary.missingNames > 0 && ` · ${summary.missingNames} missing`}
					</span>
				)}
			</p>
			<div className={styles.filters} role="group" aria-label="Show cards">
				{FILTERS.map((item) => (
					<button
						key={item.filter}
						type="button"
						aria-pressed={filter === item.filter}
						onClick={() => onFilter(item.filter)}
					>
						{item.label}
					</button>
				))}
			</div>
			{summary.missingCopies > 0 && (
				<button type="button" className={styles.addMissing} onClick={onAddMissing}>
					Add {summary.missingCopies} missing to…
				</button>
			)}
		</section>
	);
}

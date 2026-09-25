import React from 'react';
import type { RowOwnership } from 'src/domain/library/ownership';

import styles from './ownership-badge.module.css';

/** A short label shown beside a card, such as where its copies are kept. */
export type BoardChip = {
	label: string;
	tone: 'neutral' | 'owned' | 'partial' | 'missing';
};

/** More copies than this show as a count instead of one pip each. */
const MAX_PIPS = 8;

function statusLabel(row: RowOwnership): string {
	if (row.status === 'owned') return 'owned';
	if (row.status === 'missing') return 'missing';
	return `${row.owned} of ${row.need}`;
}

/** A description of the row's ownership for screen readers and tooltips. */
export function ownershipDescription(row: RowOwnership): string {
	const parts = [`${row.owned} owned`];
	if (row.inOtherDecks > 0) parts.push(`${row.free} not in other decks`);
	if (row.wanted > 0) parts.push(`${row.wanted} wanted`);
	return parts.join(', ');
}

/** One pip per copy a deck needs, filled for each owned copy. */
export function OwnershipPips(props: { row: RowOwnership }) {
	const { row } = props;
	if (row.need > MAX_PIPS)
		return (
			<span className={styles.pipCount} aria-hidden="true">
				{Math.min(row.owned, row.need)}/{row.need}
			</span>
		);
	const pips = [];
	for (let index = 0; index < row.need; index++)
		pips.push(<i key={index} className={index < row.owned ? styles.filled : undefined} />);
	return (
		<span className={styles.pips} aria-hidden="true">
			{pips}
		</span>
	);
}

/** Owned, partly owned or missing, as a small colored chip. `compact` shows only a mark. */
export function OwnershipBadge(props: { row: RowOwnership; compact?: boolean }) {
	const { row, compact } = props;
	const label = compact ? (row.status === 'owned' ? '✓' : row.status === 'missing' ? `0/${row.need}` : `${row.owned}/${row.need}`) : statusLabel(row);
	return (
		<span className={`${styles.chip} ${styles[row.status]}`} title={ownershipDescription(row)} aria-label={`${statusLabel(row)}: ${ownershipDescription(row)}`}>
			{label}
		</span>
	);
}

/** Chips such as where copies are kept. */
export function BoardChips(props: { chips: BoardChip[] | undefined }) {
	const { chips } = props;
	if (!chips || !chips.length) return null;
	return (
		<span className={styles.chips}>
			{chips.map((chip) => (
				<span key={`${chip.tone}:${chip.label}`} className={`${styles.chip} ${styles[chip.tone]}`}>
					{chip.label}
				</span>
			))}
		</span>
	);
}

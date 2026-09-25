import React from 'react';
import type { CardSource } from './use-card-source';

import styles from './card-source.module.css';

type CardSourceSwitchProps = {
	source: CardSource;
	onChange: (source: CardSource) => void;
	disabled?: boolean;
	/** Stretches the two halves across the width, for phones. */
	wide?: boolean;
};

/** Chooses whether the card search looks in the owned collections or at every card. */
export function CardSourceSwitch(props: CardSourceSwitchProps) {
	const { source, onChange, disabled, wide } = props;
	return (
		<div className={wide ? `${styles.switch} ${styles.wide}` : styles.switch} role="group" aria-label="Search in">
			<button type="button" aria-pressed={source === 'collection'} disabled={disabled} onClick={() => onChange('collection')}>
				My collection
			</button>
			<button type="button" aria-pressed={source === 'all'} disabled={disabled} onClick={() => onChange('all')}>
				All cards
			</button>
		</div>
	);
}

type OwnedNoteProps = {
	/** What is owned of the chosen card, or null when none is. */
	summary: string | null;
	/** Whether the chosen card is short of copies for this add. */
	short: boolean;
};

/** A line under the name field saying what the collections hold of the chosen card. */
export function OwnedNote(props: OwnedNoteProps) {
	const { summary, short } = props;
	if (!summary) return null;
	return <p className={short ? `${styles.note} ${styles.short}` : styles.note}>{summary}</p>;
}

type NoOwnedMatchProps = {
	query: string;
	onSearchAll: () => void;
};

/** Says nothing owned matches, with a way to search every card for the same text. */
export function NoOwnedMatch(props: NoOwnedMatchProps) {
	const { query, onSearchAll } = props;
	return (
		<p className={styles.noMatch}>
			Nothing in your collection matches “{query.trim()}”.{' '}
			<button type="button" onClick={onSearchAll}>
				Search all cards
			</button>
		</p>
	);
}

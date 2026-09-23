import React from 'react';
import { Link } from 'react-router-dom';

import styles from './deck.module.css';

/** The tabletop view is hidden from the switch for now; its route still works. */
export type DeckView = 'list' | 'stats' | 'notes' | 'tabletop';

const TABS: { view: DeckView; label: string; path: string }[] = [
	{ view: 'list', label: 'Deck list', path: '' },
	{ view: 'stats', label: 'Stats', path: '/stats' },
	{ view: 'notes', label: 'Notes', path: '/notes' }
];

export function DeckViewSwitch(props: { deckId: string; view: DeckView }) {
	const { deckId, view } = props;
	return (
		<nav className={styles['deck-view-switch']} aria-label="Deck view">
			{TABS.map((tab) => (
				<Link
					key={tab.view}
					to={`/deck/${deckId}${tab.path}`}
					aria-current={view === tab.view ? 'page' : undefined}
				>
					{tab.label}
				</Link>
			))}
		</nav>
	);
}

import React, { useId } from 'react';
import type { ArenaTableLayout } from '../MTGArenaTableBoard/arena-table-parts';
import styles from './mobile-mtg-arena-table-board.module.css';

/** The phone tabletop's title and Arena search, above either phone tabletop board. */
export function MobileMTGArenaTableHeader(props: {
	search: string;
	onSearchChange: (search: string) => void;
	layout: ArenaTableLayout;
}) {
	const { search, onSearchChange, layout } = props;
	const parsed = layout.search;
	const searchId = useId();
	const statusId = useId();
	return (
		<header className={styles.header}>
			<h1 id="mobile-tabletop-title">Tabletop</h1>
			<p>Swipe a row to see more. Tap a card for details.</p>
			<label htmlFor={searchId} className={styles.searchLabel}>
				Search
			</label>
			<input
				id={searchId}
				className={styles.search}
				type="search"
				value={search}
				placeholder="t:creature mv<=2"
				spellCheck={false}
				autoComplete="off"
				autoCapitalize="off"
				aria-describedby={statusId}
				aria-invalid={parsed?.ok === false || undefined}
				onChange={(event) => onSearchChange(event.target.value)}
			/>
			<p
				id={statusId}
				className={parsed?.ok === false ? styles.error : undefined}
				aria-live="polite"
			>
				{parsed?.ok === false
					? parsed.error
					: layout.split
						? `${layout.matchingCount} of ${layout.total} cards match.`
						: 'Uses MTG Arena’s search syntax, like t:creature or c:g.'}
			</p>
		</header>
	);
}

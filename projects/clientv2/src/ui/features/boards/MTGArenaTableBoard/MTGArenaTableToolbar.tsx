import React, { useId } from 'react';
import { ArenaSearchHelp } from './ArenaSearchHelp';
import type { ArenaTableLayout } from './arena-table-parts';
import styles from './mtg-arena-table-board.module.css';

/** The tabletop's title, Arena search and card size, above either tabletop board. */
export function MTGArenaTableToolbar(props: {
	search: string;
	onSearchChange: (search: string) => void;
	layout: ArenaTableLayout;
	cardSize: number;
	onCardSizeChange: (size: number) => void;
}) {
	const { search, onSearchChange, layout, cardSize, onCardSizeChange } = props;
	const parsed = layout.search;
	const searchId = useId();
	const statusId = useId();
	return (
		<header className={styles.toolbar}>
			<div>
				<h1 id="tabletop-title">Tabletop</h1>
				<p>Hover to reveal a card. Select it for details.</p>
			</div>
			<div className={styles.search}>
				<label htmlFor={searchId}>Search</label>
				<input
					id={searchId}
					type="search"
					value={search}
					placeholder="t:creature mv<=2"
					spellCheck={false}
					autoComplete="off"
					aria-describedby={statusId}
					aria-invalid={parsed?.ok === false || undefined}
					onChange={(event) => onSearchChange(event.target.value)}
				/>
				<p
					id={statusId}
					className={parsed?.ok === false ? styles.error : styles.status}
					aria-live="polite"
				>
					{parsed?.ok === false
						? parsed.error
						: layout.split
							? `${layout.matchingCount} of ${layout.total} cards match.`
							: 'Uses MTG Arena’s search syntax.'}
				</p>
				<ArenaSearchHelp />
			</div>
			<label className={styles.size}>
				Card size
				<input
					type="range"
					min="140"
					max="280"
					step="10"
					value={cardSize}
					onChange={(event) => onCardSizeChange(Number(event.target.value))}
				/>
			</label>
		</header>
	);
}

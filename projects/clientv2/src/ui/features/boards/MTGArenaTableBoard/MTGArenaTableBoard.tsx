import React, { useId, useMemo, useState } from 'react';
import type { BoardProps } from '../board.types';
import { ArenaSearchHelp } from './ArenaSearchHelp';
import { MTGArenaTableVirtualBoard } from './MTGArenaTableVirtualBoard';
import { splitArenaTable } from './split-arena-table';
import styles from './mtg-arena-table-board.module.css';

export type MTGArenaTableBoardProps = BoardProps & {
	/** MTG Arena search syntax; see arena-search.ts. */
	search: string;
	onSearchChange: (search: string) => void;
};

/**
 * The tabletop view: main-board cards stacked in columns by mana value, like
 * MTG Arena. A search splits the table into two virtual boards: the cards it
 * finds on top, everything else below.
 */
export function MTGArenaTableBoard(props: MTGArenaTableBoardProps) {
	const { cards, onCardEvent, search, onSearchChange } = props;
	const { search: parsed, matching, others } = useMemo(
		() => splitArenaTable(cards, search),
		[cards, search]
	);
	const [cardSize, setCardSize] = useState(200);
	const searchId = useId();
	const statusId = useId();
	const matchingCount =
		matching?.reduce((total, group) => total + group.count, 0) ?? 0;
	const total =
		matchingCount + others.reduce((sum, group) => sum + group.count, 0);
	return (
		<section className={styles.tabletop} aria-labelledby="tabletop-title">
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
							: matching
								? `${matchingCount} of ${total} cards match.`
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
						onChange={(event) => setCardSize(Number(event.target.value))}
					/>
				</label>
			</header>
			{matching ? (
				<>
					<MTGArenaTableVirtualBoard
						groups={matching}
						label="Matching"
						showLabel
						cardWidth={cardSize}
						emptyText="No cards match this search."
						onCardEvent={onCardEvent}
					/>
					<MTGArenaTableVirtualBoard
						groups={others}
						label="Everything else"
						showLabel
						cardWidth={cardSize}
						emptyText="Every card matches this search."
						onCardEvent={onCardEvent}
					/>
				</>
			) : (
				<MTGArenaTableVirtualBoard
					groups={others}
					label="Main board"
					showLabel={false}
					cardWidth={cardSize}
					emptyText="This deck is empty. Add cards to start your tabletop."
					onCardEvent={onCardEvent}
				/>
			)}
		</section>
	);
}

import React, { useId, useMemo } from 'react';
import type { BoardProps } from '../board.types';
import { splitArenaTable } from '../MTGArenaTableBoard/split-arena-table';
import { MobileMTGArenaTableVirtualBoard } from './MobileMTGArenaTableVirtualBoard';
import styles from './mobile-mtg-arena-table-board.module.css';

export type MobileMTGArenaTableBoardProps = BoardProps & {
	/** MTG Arena search syntax; see MTGArenaTableBoard/arena-search.ts. */
	search: string;
	onSearchChange: (search: string) => void;
};

/**
 * The phone tabletop: one swipeable row of main-board cards per mana value. A
 * search splits it into two virtual boards, the cards it finds on top.
 */
export function MobileMTGArenaTableBoard(props: MobileMTGArenaTableBoardProps) {
	const { cards, onCardEvent, search, onSearchChange } = props;
	const { search: parsed, matching, others } = useMemo(
		() => splitArenaTable(cards, search),
		[cards, search]
	);
	const searchId = useId();
	const statusId = useId();
	const matchingCount =
		matching?.reduce((total, group) => total + group.count, 0) ?? 0;
	const total =
		matchingCount + others.reduce((sum, group) => sum + group.count, 0);
	return (
		<section
			className={styles.tabletop}
			aria-labelledby="mobile-tabletop-title"
		>
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
						: matching
							? `${matchingCount} of ${total} cards match.`
							: 'Uses MTG Arena’s search syntax, like t:creature or c:g.'}
				</p>
			</header>
			{matching ? (
				<>
					<MobileMTGArenaTableVirtualBoard
						groups={matching}
						label="Matching"
						showLabel
						emptyText="No cards match this search."
						onCardEvent={onCardEvent}
					/>
					<MobileMTGArenaTableVirtualBoard
						groups={others}
						label="Everything else"
						showLabel
						emptyText="Every card matches this search."
						onCardEvent={onCardEvent}
					/>
				</>
			) : (
				<MobileMTGArenaTableVirtualBoard
					groups={others}
					label="Main board"
					showLabel={false}
					emptyText="This deck is empty. Add cards to start your tabletop."
					onCardEvent={onCardEvent}
				/>
			)}
		</section>
	);
}

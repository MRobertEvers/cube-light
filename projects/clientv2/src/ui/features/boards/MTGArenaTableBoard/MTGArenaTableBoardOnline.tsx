import React, { useMemo, useState } from 'react';
import { arenaTableLayout } from './arena-table-parts';
import type { MTGArenaTableBoardProps } from './mtg-arena-table.types';
import { MTGArenaTableToolbar } from './MTGArenaTableToolbar';
import { MTGArenaTableVirtualBoardOnline } from './MTGArenaTableVirtualBoardOnline';
import styles from './mtg-arena-table-board.module.css';

/**
 * The tabletop view: main-board cards stacked in columns by mana value, like
 * MTG Arena. A search splits the table into two virtual boards: the cards it
 * finds on top, everything else below.
 */
export function MTGArenaTableBoardOnline(props: MTGArenaTableBoardProps) {
	const { cards, onCardEvent, search, onSearchChange, annotations } = props;
	const layout = useMemo(() => arenaTableLayout(cards, search), [cards, search]);
	const [cardSize, setCardSize] = useState(200);
	return (
		<section className={styles.tabletop} aria-labelledby="tabletop-title">
			<MTGArenaTableToolbar
				search={search}
				onSearchChange={onSearchChange}
				layout={layout}
				cardSize={cardSize}
				onCardSizeChange={setCardSize}
			/>
			{layout.parts.map((part) => (
				<MTGArenaTableVirtualBoardOnline
					key={part.part}
					groups={part.groups}
					label={part.label}
					showLabel={part.showLabel}
					cardWidth={cardSize}
					emptyText={part.emptyText}
					onCardEvent={onCardEvent}
					annotations={annotations}
				/>
			))}
		</section>
	);
}

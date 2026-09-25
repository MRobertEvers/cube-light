import React, { useMemo, useState } from 'react';
import { arenaTableLayout } from './arena-table-parts';
import type { MTGArenaTableBoardProps } from './mtg-arena-table.types';
import { MTGArenaTableToolbar } from './MTGArenaTableToolbar';
import { MTGArenaTableVirtualBoardOffline } from './MTGArenaTableVirtualBoardOffline';
import styles from './mtg-arena-table-board.module.css';

/**
 * The tabletop while the server is out of reach: the same stacks, search and
 * card size, with each card drawn as text, since its image may never have
 * been fetched.
 */
export function MTGArenaTableBoardOffline(props: MTGArenaTableBoardProps) {
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
				<MTGArenaTableVirtualBoardOffline
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

import React, { useMemo, useState } from 'react';
import { arenaTableLayout } from './arena-table-parts';
import type { MTGArenaTableBoardProps } from './mtg-arena-table.types';
import { MTGArenaTableToolbar } from './MTGArenaTableToolbar';
import { MTGArenaTableVirtualBoardOfflineArt } from './MTGArenaTableVirtualBoardOfflineArt';
import styles from './mtg-arena-table-board.module.css';

/**
 * The tabletop while the server is out of reach and the offline card art is
 * installed: the same stacks, search and card size, with each card drawn from
 * its art and text, since its image may never have been fetched.
 */
export function MTGArenaTableBoardOfflineArt(props: MTGArenaTableBoardProps) {
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
				<MTGArenaTableVirtualBoardOfflineArt
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

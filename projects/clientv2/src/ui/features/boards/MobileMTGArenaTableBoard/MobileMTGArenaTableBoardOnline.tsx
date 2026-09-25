import React, { useMemo } from 'react';
import { arenaTableLayout } from '../MTGArenaTableBoard/arena-table-parts';
import type { MobileMTGArenaTableBoardProps } from './mobile-mtg-arena-table.types';
import { MobileMTGArenaTableHeader } from './MobileMTGArenaTableHeader';
import { MobileMTGArenaTableVirtualBoardOnline } from './MobileMTGArenaTableVirtualBoardOnline';
import styles from './mobile-mtg-arena-table-board.module.css';

/**
 * The phone tabletop: one swipeable row of main-board cards per mana value. A
 * search splits it into two virtual boards, the cards it finds on top.
 */
export function MobileMTGArenaTableBoardOnline(props: MobileMTGArenaTableBoardProps) {
	const { cards, onCardEvent, search, onSearchChange, annotations } = props;
	const layout = useMemo(() => arenaTableLayout(cards, search), [cards, search]);
	return (
		<section
			className={styles.tabletop}
			aria-labelledby="mobile-tabletop-title"
		>
			<MobileMTGArenaTableHeader
				search={search}
				onSearchChange={onSearchChange}
				layout={layout}
			/>
			{layout.parts.map((part) => (
				<MobileMTGArenaTableVirtualBoardOnline
					key={part.part}
					groups={part.groups}
					label={part.label}
					showLabel={part.showLabel}
					emptyText={part.emptyText}
					onCardEvent={onCardEvent}
					annotations={annotations}
				/>
			))}
		</section>
	);
}

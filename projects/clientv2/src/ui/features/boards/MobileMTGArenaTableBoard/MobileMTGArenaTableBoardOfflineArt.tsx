import React, { useMemo } from 'react';
import { arenaTableLayout } from '../MTGArenaTableBoard/arena-table-parts';
import type { MobileMTGArenaTableBoardProps } from './mobile-mtg-arena-table.types';
import { MobileMTGArenaTableHeader } from './MobileMTGArenaTableHeader';
import { MobileMTGArenaTableVirtualBoardOfflineArt } from './MobileMTGArenaTableVirtualBoardOfflineArt';
import styles from './mobile-mtg-arena-table-board.module.css';

/**
 * The phone tabletop while the server is out of reach and the offline card art
 * is installed: the same rows and search, with each card drawn from its art and
 * text, since its image may never have been fetched.
 */
export function MobileMTGArenaTableBoardOfflineArt(props: MobileMTGArenaTableBoardProps) {
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
				<MobileMTGArenaTableVirtualBoardOfflineArt
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

import React, { type ComponentType, useMemo } from 'react';
import { groupTabletopColumns } from '../../../../domain/deck/group-tabletop-cards';
import type { TabletopCardProps } from '../MTGArenaTableBoard/mtg-arena-table.types';
import type { MobileMTGArenaTableVirtualBoardProps } from './mobile-mtg-arena-table.types';
import styles from './mobile-mtg-arena-table-board.module.css';

/**
 * One swipeable row of cards per mana value, the layout both phone virtual
 * boards share; `Card` draws each card in its row.
 */
export function MobileTabletopRows(
	props: MobileMTGArenaTableVirtualBoardProps & { Card: ComponentType<TabletopCardProps> }
) {
	const { groups, label, showLabel, emptyText, onCardEvent, annotations, Card } = props;
	const rows = useMemo(() => groupTabletopColumns(groups), [groups]);
	const count = groups.reduce((total, group) => total + group.count, 0);
	return (
		<section className={styles.virtualBoard} aria-label={label}>
			{showLabel && (
				<h2 className={styles.boardLabel}>
					{label}
					<span>{count}</span>
				</h2>
			)}
			{rows.length === 0 ? (
				<p className={styles.empty}>{emptyText}</p>
			) : (
				rows.map((row) => (
					<section
						key={row.label}
						className={styles.row}
						aria-label={row.label}
					>
						<h3>
							{row.label}
							<span>{row.count}</span>
						</h3>
						<ul className={styles.strip}>
							{row.groups.map((group) => (
								<li key={group.name}>
									<Card
										group={group}
										onCardEvent={onCardEvent}
										annotations={annotations}
									/>
								</li>
							))}
						</ul>
					</section>
				))
			)}
		</section>
	);
}

import React, { type ComponentType, useMemo } from 'react';
import { groupTabletopColumns } from '../../../../domain/deck/group-tabletop-cards';
import type { MTGArenaTableVirtualBoardProps, TabletopCardProps } from './mtg-arena-table.types';
import styles from './mtg-arena-table-virtual-board.module.css';

/**
 * Cards stacked in columns by mana value, the layout both desktop virtual
 * boards share; `Card` draws each card in its stack.
 */
export function TabletopColumns(
	props: MTGArenaTableVirtualBoardProps & { Card: ComponentType<TabletopCardProps> }
) {
	const { groups, label, showLabel, cardWidth, emptyText, onCardEvent, annotations, Card } = props;
	const columns = useMemo(() => groupTabletopColumns(groups), [groups]);
	const count = groups.reduce((total, group) => total + group.count, 0);
	return (
		<section className={styles.board} aria-label={label}>
			{showLabel && (
				<h2 className={styles.label}>
					{label}
					<span>{count}</span>
				</h2>
			)}
			{columns.length === 0 ? (
				<p className={styles.empty}>{emptyText}</p>
			) : (
				<div
					className={styles.scroll}
					role="region"
					aria-label={`${label}: cards by mana value; scroll horizontally to see all columns`}
					tabIndex={0}
				>
					<div
						className={styles.columns}
						style={{ '--card-width': `${cardWidth}px` } as React.CSSProperties}
					>
						{columns.map((column) => (
							<section
								key={column.label}
								className={styles.column}
								aria-label={column.label}
							>
								<h3>
									{column.label}
									<span>{column.count}</span>
								</h3>
								<ul className={styles.stack}>
									{column.groups.map((group) => (
										<li key={group.name} className={styles.slot}>
											<Card
												group={group}
												onCardEvent={onCardEvent}
												annotations={annotations}
											/>
										</li>
									))}
								</ul>
							</section>
						))}
					</div>
				</div>
			)}
		</section>
	);
}

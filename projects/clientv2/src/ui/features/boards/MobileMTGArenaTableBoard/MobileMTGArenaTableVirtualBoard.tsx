import React, { useMemo, useState } from 'react';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import { groupTabletopColumns } from '../../../../domain/deck/group-tabletop-cards';
import type { BoardProps } from '../board.types';
import styles from './mobile-mtg-arena-table-board.module.css';

export type MobileMTGArenaTableVirtualBoardProps = {
	groups: readonly DeckCardGroup[];
	/** Heads the board when the table is split; always names it for assistive tech. */
	label: string;
	showLabel: boolean;
	emptyText: string;
	onCardEvent: BoardProps['onCardEvent'];
};

function TabletopCard(props: {
	group: DeckCardGroup;
	onCardEvent: BoardProps['onCardEvent'];
}) {
	const { group, onCardEvent } = props;
	const card = group.printings[0];
	const source = card.images?.normal || card.image;
	const [failedSource, setFailedSource] = useState<string | null>(null);
	return (
		<button
			type="button"
			className={styles.card}
			aria-label={`Open ${group.name}, ${group.count} ${group.count === 1 ? 'copy' : 'copies'}`}
			onClick={() => onCardEvent({ type: 'view', card, group })}
		>
			{source && source !== failedSource ? (
				<img
					src={source}
					alt={group.name}
					loading="lazy"
					draggable={false}
					onError={() => setFailedSource(source)}
				/>
			) : (
				<span className={styles.fallback}>{group.name}</span>
			)}
			{group.count > 1 && (
				<span className={styles.quantity} aria-hidden="true">
					×{group.count}
				</span>
			)}
		</button>
	);
}

/** One swipeable row of cards per mana value: one board of the phone tabletop. */
export function MobileMTGArenaTableVirtualBoard(
	props: MobileMTGArenaTableVirtualBoardProps
) {
	const { groups, label, showLabel, emptyText, onCardEvent } = props;
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
									<TabletopCard
										group={group}
										onCardEvent={onCardEvent}
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

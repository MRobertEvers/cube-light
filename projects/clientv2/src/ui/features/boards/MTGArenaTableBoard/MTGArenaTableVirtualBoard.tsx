import React, { useMemo, useState } from 'react';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import { groupTabletopColumns } from '../../../../domain/deck/group-tabletop-cards';
import type { BoardAnnotations, BoardProps } from '../board.types';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import styles from './mtg-arena-table-virtual-board.module.css';

export type MTGArenaTableVirtualBoardProps = {
	groups: readonly DeckCardGroup[];
	/** Heads the board when the table is split; always names it for assistive tech. */
	label: string;
	showLabel: boolean;
	cardWidth: number;
	emptyText: string;
	onCardEvent: BoardProps['onCardEvent'];
	annotations?: BoardAnnotations;
};

function TabletopCard(props: {
	group: DeckCardGroup;
	onCardEvent: BoardProps['onCardEvent'];
	annotations?: BoardAnnotations;
}) {
	const { group, onCardEvent, annotations } = props;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const card = group.printings[0];
	const source = card.images?.normal || card.image;
	const [failedSource, setFailedSource] = useState<string | null>(null);
	// The button covers only the part of the card left showing in its stack. The
	// whole card is drawn past it and ignores the pointer, so a raised card never
	// hides the cards below it from hovering.
	return (
		<button
			type="button"
			className={styles.hit}
			aria-label={`Open ${group.name}, ${group.count} ${group.count === 1 ? 'copy' : 'copies'}`}
			onClick={() => onCardEvent({ type: 'view', card, group })}
		>
			<span className={owned?.status === 'missing' ? `${styles.face} ${styles.missing}` : styles.face}>
				{source && source !== failedSource ? (
					<img
						src={source}
						alt=""
						loading="lazy"
						draggable={false}
						onError={() => setFailedSource(source)}
					/>
				) : (
					<span className={styles.fallback}>{group.name}</span>
				)}
				{owned && (
					<span className={styles.ownership}>
						<OwnershipBadge row={owned} compact />
					</span>
				)}
				{owned?.status === 'partial' && (
					<span className={styles.ownedBar} aria-hidden="true">
						<i style={{ width: `${Math.round((owned.owned / owned.need) * 100)}%` }} />
					</span>
				)}
				{group.count > 1 && (
					<span className={styles.quantity} aria-hidden="true">
						×{group.count}
					</span>
				)}
			</span>
		</button>
	);
}

/** Cards stacked in columns by mana value, like one board of MTG Arena's deck view. */
export function MTGArenaTableVirtualBoard(props: MTGArenaTableVirtualBoardProps) {
	const { groups, label, showLabel, cardWidth, emptyText, onCardEvent, annotations } = props;
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
											<TabletopCard
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

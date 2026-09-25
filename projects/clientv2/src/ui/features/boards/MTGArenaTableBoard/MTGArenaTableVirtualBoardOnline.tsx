import React, { useState } from 'react';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { MTGArenaTableVirtualBoardProps, TabletopCardProps } from './mtg-arena-table.types';
import { TabletopColumns } from './TabletopColumns';
import styles from './mtg-arena-table-virtual-board.module.css';

function TabletopCardOnline(props: TabletopCardProps) {
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

/** Card images stacked in columns by mana value, like one board of MTG Arena's deck view. */
export function MTGArenaTableVirtualBoardOnline(props: MTGArenaTableVirtualBoardProps) {
	return (
		<TabletopColumns
			groups={props.groups}
			label={props.label}
			showLabel={props.showLabel}
			cardWidth={props.cardWidth}
			emptyText={props.emptyText}
			onCardEvent={props.onCardEvent}
			annotations={props.annotations}
			Card={TabletopCardOnline}
		/>
	);
}

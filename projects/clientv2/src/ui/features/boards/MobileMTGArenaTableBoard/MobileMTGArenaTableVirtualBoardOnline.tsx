import React, { useState } from 'react';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { TabletopCardProps } from '../MTGArenaTableBoard/mtg-arena-table.types';
import type { MobileMTGArenaTableVirtualBoardProps } from './mobile-mtg-arena-table.types';
import { MobileTabletopRows } from './MobileTabletopRows';
import styles from './mobile-mtg-arena-table-board.module.css';

function TabletopCardOnline(props: TabletopCardProps) {
	const { group, onCardEvent, annotations } = props;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const card = group.printings[0];
	const source = card.images?.normal || card.image;
	const [failedSource, setFailedSource] = useState<string | null>(null);
	return (
		<button
			type="button"
			className={owned?.status === 'missing' ? `${styles.card} ${styles.missing}` : styles.card}
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
		</button>
	);
}

/** Card images in one swipeable row per mana value: one board of the phone tabletop. */
export function MobileMTGArenaTableVirtualBoardOnline(
	props: MobileMTGArenaTableVirtualBoardProps
) {
	return (
		<MobileTabletopRows
			groups={props.groups}
			label={props.label}
			showLabel={props.showLabel}
			emptyText={props.emptyText}
			onCardEvent={props.onCardEvent}
			annotations={props.annotations}
			Card={TabletopCardOnline}
		/>
	);
}

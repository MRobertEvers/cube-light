import React from 'react';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { TabletopCardProps } from '../MTGArenaTableBoard/mtg-arena-table.types';
import { TabletopArtFace } from '../MTGArenaTableBoard/TabletopArtFace';
import type { MobileMTGArenaTableVirtualBoardProps } from './mobile-mtg-arena-table.types';
import { MobileTabletopRows } from './MobileTabletopRows';
import styles from './mobile-mtg-arena-table-board.module.css';

function TabletopCardOfflineArt(props: TabletopCardProps) {
	const { group, onCardEvent, annotations } = props;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const card = group.printings[0];
	return (
		<button
			type="button"
			className={owned?.status === 'missing' ? `${styles.card} ${styles.missing}` : styles.card}
			aria-label={`Open ${group.name}, ${group.count} ${group.count === 1 ? 'copy' : 'copies'}`}
			onClick={() => onCardEvent({ type: 'view', card, group })}
		>
			<TabletopArtFace card={card} />
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

/** Cards drawn from their text and offline art in one swipeable row per mana value: one phone tabletop board while the server is out of reach. */
export function MobileMTGArenaTableVirtualBoardOfflineArt(
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
			Card={TabletopCardOfflineArt}
		/>
	);
}

import React from 'react';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { TabletopCardProps } from '../MTGArenaTableBoard/mtg-arena-table.types';
import { TabletopTextFace } from '../MTGArenaTableBoard/TabletopTextFace';
import type { MobileMTGArenaTableVirtualBoardProps } from './mobile-mtg-arena-table.types';
import { MobileTabletopRows } from './MobileTabletopRows';
import styles from './mobile-mtg-arena-table-board.module.css';

function TabletopCardOffline(props: TabletopCardProps) {
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
			<TabletopTextFace group={group} owned={owned} />
		</button>
	);
}

/** Cards as text in one swipeable row per mana value: one phone tabletop board while images need the server. */
export function MobileMTGArenaTableVirtualBoardOffline(
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
			Card={TabletopCardOffline}
		/>
	);
}

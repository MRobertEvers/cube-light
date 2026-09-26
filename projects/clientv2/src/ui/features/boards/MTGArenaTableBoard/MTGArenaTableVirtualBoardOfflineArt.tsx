import React from 'react';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { MTGArenaTableVirtualBoardProps, TabletopCardProps } from './mtg-arena-table.types';
import { TabletopArtFace } from './TabletopArtFace';
import { TabletopColumns } from './TabletopColumns';
import styles from './mtg-arena-table-virtual-board.module.css';

function TabletopCardOfflineArt(props: TabletopCardProps) {
	const { group, onCardEvent, annotations } = props;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const card = group.printings[0];
	// As online, the button covers only the part of the card left showing in its stack.
	return (
		<button
			type="button"
			className={styles.hit}
			aria-label={`Open ${group.name}, ${group.count} ${group.count === 1 ? 'copy' : 'copies'}`}
			onClick={() => onCardEvent({ type: 'view', card, group })}
		>
			<span className={owned?.status === 'missing' ? `${styles.face} ${styles.missing}` : styles.face}>
				<TabletopArtFace group={group} owned={owned} />
			</span>
		</button>
	);
}

/** Cards drawn from the offline art pack, stacked in columns by mana value: one tabletop board while the server is out of reach. */
export function MTGArenaTableVirtualBoardOfflineArt(props: MTGArenaTableVirtualBoardProps) {
	return (
		<TabletopColumns
			groups={props.groups}
			label={props.label}
			showLabel={props.showLabel}
			cardWidth={props.cardWidth}
			emptyText={props.emptyText}
			onCardEvent={props.onCardEvent}
			annotations={props.annotations}
			Card={TabletopCardOfflineArt}
		/>
	);
}

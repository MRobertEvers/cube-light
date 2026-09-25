import React from 'react';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import type { RowOwnership } from '../../../../domain/library/ownership';
import { ManaCost } from '../../../kit/components/ManaCost/ManaCost';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { cardStats } from '../../CardPreviewer/CardRulesText';
import styles from './tabletop-text-face.module.css';

/**
 * A tabletop card drawn as text, filling its card-shaped frame: name and
 * copies, then cost and ownership, then type line, which all show in a
 * stacked card's band, and power and toughness at the foot.
 */
export function TabletopTextFace(props: { group: DeckCardGroup; owned?: RowOwnership }) {
	const { group, owned } = props;
	const card = group.printings[0];
	const stats = cardStats(card);
	return (
		<span className={styles.face}>
			<span className={styles.title}>
				<span className={styles.name}>{group.name}</span>
				{group.count > 1 && (
					<span className={styles.count} aria-hidden="true">
						×{group.count}
					</span>
				)}
			</span>
			<span className={styles.line}>
				<ManaCost cost={card.manaCost} />
				{owned && <OwnershipBadge row={owned} compact />}
			</span>
			{card.type && <span className={styles.type}>{card.type}</span>}
			{stats && <span className={styles.stats}>{stats}</span>}
			{owned?.status === 'partial' && (
				<span className={styles.ownedBar} aria-hidden="true">
					<i style={{ width: `${Math.round((owned.owned / owned.need) * 100)}%` }} />
				</span>
			)}
		</span>
	);
}

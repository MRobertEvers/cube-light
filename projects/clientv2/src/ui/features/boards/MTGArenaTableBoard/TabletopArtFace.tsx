import React from 'react';
import type { DeckCardGroup } from '../../../../domain/deck/group-deck-cards';
import type { RowOwnership } from '../../../../domain/library/ownership';
import { ManaCost } from '../../../kit/components/ManaCost/ManaCost';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { useOfflineCardArt } from '../../../kit/hooks/useOfflineCardArt';
import { cardStats } from '../../CardPreviewer/CardRulesText';
import textStyles from './tabletop-text-face.module.css';
import styles from './tabletop-art-face.module.css';

/**
 * A tabletop card drawn from the offline card art pack, filling its card-shaped
 * frame as a card does: name and copies, cost and ownership, which show in a
 * stacked card's band with the top of the art, then the art, type line and rules
 * text, and power and toughness at the foot. Without art for the card, the text alone.
 */
export function TabletopArtFace(props: { group: DeckCardGroup; owned?: RowOwnership }) {
	const { group, owned } = props;
	const card = group.printings[0];
	const art = useOfflineCardArt(card);
	const stats = cardStats(card);
	return (
		<span className={`${textStyles.face} ${styles.face}`}>
			<span className={textStyles.title}>
				<span className={textStyles.name}>{group.name}</span>
				{group.count > 1 && (
					<span className={textStyles.count} aria-hidden="true">
						×{group.count}
					</span>
				)}
			</span>
			<span className={textStyles.line}>
				<ManaCost cost={card.manaCost} />
				{owned && <OwnershipBadge row={owned} compact />}
			</span>
			{art !== null && (
				<span className={styles.art}>
					{art && <img src={art} alt="" draggable={false} />}
				</span>
			)}
			{card.type && <span className={textStyles.type}>{card.type}</span>}
			{card.text && <span className={styles.rules}>{card.text}</span>}
			{stats && <span className={textStyles.stats}>{stats}</span>}
			{owned?.status === 'partial' && (
				<span className={textStyles.ownedBar} aria-hidden="true">
					<i style={{ width: `${Math.round((owned.owned / owned.need) * 100)}%` }} />
				</span>
			)}
		</span>
	);
}

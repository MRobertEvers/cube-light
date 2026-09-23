import React, { useMemo, useState } from 'react';
import type { DeckCardGroup } from '../../utils/group-deck-cards';
import { groupTabletopCards } from '../../utils/group-tabletop-cards';
import type { BoardProps } from '../board.types';
import styles from './mobile-mtg-arena-table-board.module.css';

export type MobileMTGArenaTableBoardProps = BoardProps;

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

/** The phone tabletop: one swipeable row of main-board cards per mana value. */
export function MobileMTGArenaTableBoard(props: MobileMTGArenaTableBoardProps) {
	const { cards, onCardEvent } = props;
	const rows = useMemo(
		() =>
			groupTabletopCards(
				Object.values(cards.main.cardCategories).flatMap(
					(category) => category.cards
				)
			),
		[cards.main]
	);
	return (
		<section
			className={styles.tabletop}
			aria-labelledby="mobile-tabletop-title"
		>
			<header className={styles.header}>
				<h1 id="mobile-tabletop-title">Tabletop</h1>
				<p>Swipe a row to see more. Tap a card for details.</p>
			</header>
			{rows.length === 0 ? (
				<p className={styles.empty}>
					This deck is empty. Add cards to start your tabletop.
				</p>
			) : (
				rows.map((row) => (
					<section
						key={row.label}
						className={styles.row}
						aria-label={row.label}
					>
						<h2>
							{row.label}
							<span>{row.count}</span>
						</h2>
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

import React, { useMemo, useState } from 'react';
import type { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import type { DeckCardGroup } from '../../../../utils/group-deck-cards';
import { groupTabletopCards } from '../../../../utils/group-tabletop-cards';
import styles from './tabletop.module.css';

type Props = {
	cards: FetchAPIDeckCardResponse[];
	onCardClick: (card: FetchAPIDeckCardResponse, group: DeckCardGroup) => void;
};

function TabletopCard(props: {
	group: DeckCardGroup;
	onCardClick: Props['onCardClick'];
}) {
	const { group, onCardClick } = props;
	const card = group.printings[0];
	const source = card.images?.normal || card.image;
	const [failedSource, setFailedSource] = useState<string | null>(null);
	return (
		<button
			type="button"
			className={styles.card}
			aria-label={`Open ${group.name}, ${group.count} ${group.count === 1 ? 'copy' : 'copies'}`}
			onClick={() => onCardClick(card, group)}
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

export function Tabletop(props: Props) {
	const { cards, onCardClick } = props;
	const columns = useMemo(() => groupTabletopCards(cards), [cards]);
	const [cardSize, setCardSize] = useState(200);
	return (
		<section className={styles.tabletop} aria-labelledby="tabletop-title">
			<header className={styles.toolbar}>
				<div>
					<h1 id="tabletop-title">Tabletop</h1>
					<p>Hover to reveal a card. Select it for details.</p>
				</div>
				<label className={styles.size}>
					Card size
					<input
						type="range"
						min="140"
						max="280"
						step="10"
						value={cardSize}
						onChange={(event) => setCardSize(Number(event.target.value))}
					/>
				</label>
			</header>
			{columns.length === 0 ? (
				<p className={styles.empty}>
					This deck is empty. Add cards to start your tabletop.
				</p>
			) : (
				<div
					className={styles.scroll}
					role="region"
					aria-label="Cards by mana value; scroll horizontally to see all columns"
					tabIndex={0}
				>
					<div
						className={styles.columns}
						style={{ '--card-width': `${cardSize}px` } as React.CSSProperties}
					>
						{columns.map((column) => (
							<section
								key={column.label}
								className={styles.column}
								aria-label={column.label}
							>
								<h2>
									{column.label}<span>{column.count}</span>
								</h2>
								<ul className={styles.stack}>
									{column.groups.map((group) => (
										<li key={group.name} className={styles.slot}>
											<TabletopCard
												group={group}
												onCardClick={onCardClick}
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

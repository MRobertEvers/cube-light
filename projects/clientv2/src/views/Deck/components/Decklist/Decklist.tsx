import React, { useCallback } from 'react';
import { useState } from 'react';
import { SpotlightCard } from './SpotlightCard';
import { CardInteractionEvent, CardInteractionEventType, DecklistGroup } from './DecklistGroup';
import { DeckMappedData } from '../../../../workers/deck.worker.messages';
import { FetchDeckCardResponse } from '../../../../api/fetch-api-deck';

import styles from './decklist.module.css';

export type DecklistCardInfo = FetchDeckCardResponse;
type DecklistProps = {
	name: string;
	deck: DeckMappedData;
	onCardClick?: (card: DecklistCardInfo) => void;
};

export function Decklist(props: DecklistProps) {
	const { name, deck, onCardClick } = props;
	const [imageSource, setImageSource] = useState(
		null as { card: DecklistCardInfo; position: { x: number; y: number } } | null
	);

	const spotlightCards: FetchDeckCardResponse[] = [];
	for (const cardType of Object.keys(deck.cardCategories)) {
		const { cards } = deck.cardCategories[cardType];

		for (const card of cards) {
			spotlightCards.push(card);
			if (spotlightCards.length === 4) {
				break;
			}
		}
		if (spotlightCards.length === 4) {
			break;
		}
	}

	const onCardEvent = useCallback(
		(event: CardInteractionEvent) => {
			switch (event.type) {
				case CardInteractionEventType.CLICK:
					onCardClick?.(event.payload);
					break;
				case CardInteractionEventType.HOVER:
					setImageSource(event.payload);
					break;
				case CardInteractionEventType.LEAVE:
					setImageSource(null);
					break;
			}
		},
		[onCardClick, setImageSource]
	);

	return (
		<div className={styles['body']}>
			<div
				className={
					styles['hover-card'] + (imageSource ? ` ${styles['hover-card-visible']}` : '')
				}
				style={{
					left: imageSource ? imageSource.position.x - 180 : 0,
					top: imageSource ? imageSource.position.y - 120 : 0
				}}
			>
				{imageSource && (
					<img
						style={{
							borderRadius: '10px'
						}}
						src={imageSource.card.image}
					></img>
				)}
			</div>
			{/* <div className={styles['deck-header']}>
				<div className={styles['deck-header-container']}>
					<h2 className={styles['deck-title']}>{name}</h2>
				</div>
			</div> */}
			<div className={styles['decklist-container']}>
				<div className={styles['decklist-spotlight']}>
					{spotlightCards.map((card) => (
						<SpotlightCard key={card.name} card={card} />
					))}
				</div>
				<div className={styles['deck-list']}>
					<DecklistGroup
						groups={Object.keys(deck.cardCategories)
							.filter((x) => x.indexOf('Land') === -1)
							.map((groupName) => ({
								name: groupName,
								groupData: deck.cardCategories[groupName]
							}))}
						onCardEvent={onCardEvent}
					/>
					<DecklistGroup
						groups={Object.keys(deck.cardCategories)
							.filter((x) => x.indexOf('Land') !== -1)
							.map((groupName) => ({
								name: groupName,
								groupData: deck.cardCategories[groupName]
							}))}
						onCardEvent={onCardEvent}
					/>
				</div>
			</div>
		</div>
	);
}

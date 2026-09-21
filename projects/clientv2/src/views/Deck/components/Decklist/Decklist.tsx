import React, { useCallback } from 'react';
import { useState } from 'react';
import { CardInteractionEvent, CardInteractionEventType, DecklistGroup } from './DecklistGroup';
import { DeckMappedData } from '../../../../workers/deck.worker.messages';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';

import styles from './decklist.module.css';
import { SpotlightCard } from 'src/widgets/SpotlightCard/SpotlightCard';
import type { BannerCrop } from '../../../../utils/banner-crop';
import type { DeckTopStyle } from '../../../../utils/deck-top-style';
import type { BannerBlend } from '../../../../utils/banner-blend';

export type DecklistCardInfo = FetchAPIDeckCardResponse;
type DecklistProps = {
	name: string;
	deck: DeckMappedData;
	banner: { art: string | null; name: string } | null;
	bannerCrop: BannerCrop;
	bannerBlend?: BannerBlend | null;
	topStyle: DeckTopStyle;
	onCardClick?: (card: DecklistCardInfo) => void;
};

export function Decklist(props: DecklistProps) {
	const { deck, banner, bannerCrop, bannerBlend, topStyle, onCardClick } = props;
	const [imageSource, setImageSource] = useState(
		null as { card: DecklistCardInfo; position: { x: number; y: number } } | null
	);

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
			<div className={styles['decklist-container']}>
				{banner && topStyle === 'card' && <div className={styles['decklist-spotlight']}>
					<SpotlightCard art={banner.art} name={banner.name} crop={bannerCrop} bannerBlend={bannerBlend} />
				</div>}
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

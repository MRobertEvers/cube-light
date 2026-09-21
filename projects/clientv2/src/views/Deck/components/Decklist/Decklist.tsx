import React, { useCallback } from 'react';
import { useState } from 'react';
import {
	CardInteractionEvent,
	CardInteractionEventType,
	DecklistGroup
} from './DecklistGroup';
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
	const { deck, banner, bannerCrop, bannerBlend, topStyle, onCardClick } =
		props;
	const [imageSource, setImageSource] = useState(
		null as {
			card: DecklistCardInfo;
			position: { x: number; y: number };
		} | null
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
	const hoverCardWidth = 300;
	const hoverCardHeight = 420;
	const viewportWidth =
		typeof window === 'undefined' ? 1200 : window.innerWidth;
	const viewportHeight =
		typeof window === 'undefined' ? 800 : window.innerHeight;
	const hoverLeft = imageSource
		? Math.min(
				Math.max(
					16,
					imageSource.position.x > hoverCardWidth + 40
						? imageSource.position.x - hoverCardWidth - 16
						: imageSource.position.x + 120
				),
				Math.max(16, viewportWidth - hoverCardWidth - 16)
			)
		: 0;
	const hoverTop = imageSource
		? Math.min(
				Math.max(16, imageSource.position.y - 170),
				Math.max(16, viewportHeight - hoverCardHeight - 16)
			)
		: 0;

	return (
		<div className={styles['body']}>
			<div
				className={
					styles['hover-card'] +
					(imageSource ? ` ${styles['hover-card-visible']}` : '')
				}
				style={{
					left: hoverLeft,
					top: hoverTop
				}}
			>
				{imageSource && (
					<img
						src={
							imageSource.card.images?.normal ??
							imageSource.card.image
						}
						alt=""
					/>
				)}
			</div>
			<div className={styles['decklist-container']}>
				{banner && topStyle === 'card' && (
					<div className={styles['decklist-spotlight']}>
						<SpotlightCard
							art={banner.art}
							name={banner.name}
							crop={bannerCrop}
							bannerBlend={bannerBlend}
						/>
					</div>
				)}
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

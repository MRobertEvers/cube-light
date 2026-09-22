import React, { useCallback, useMemo, useState } from 'react';
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
import {
	DeckCardGroup,
	groupDeckCardsByName
} from '../../../../utils/group-deck-cards';

export type DecklistCardInfo = FetchAPIDeckCardResponse;
type DecklistProps = {
	name: string;
	deck: DeckMappedData;
	banner: { art: string | null; name: string } | null;
	bannerCrop: BannerCrop;
	bannerBlend?: BannerBlend | null;
	topStyle: DeckTopStyle;
	onCardClick?: (card: DecklistCardInfo, group: DeckCardGroup) => void;
	onManagePrintings?: (group: DeckCardGroup) => void;
};

export function Decklist(props: DecklistProps) {
	const {
		deck,
		banner,
		bannerCrop,
		bannerBlend,
		topStyle,
		onCardClick,
		onManagePrintings
	} = props;
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	// Names with more than one printing, the only rows that expand.
	const multiPrintNames = useMemo(
		() =>
			Object.values(deck.cardCategories).flatMap((category) =>
				groupDeckCardsByName(category.cards)
					.filter((group) => group.printings.length > 1)
					.map((group) => group.name)
			),
		[deck]
	);
	const allExpanded =
		multiPrintNames.length > 0 &&
		multiPrintNames.every((name) => expanded.has(name));
	const isExpanded = useCallback(
		(name: string) => expanded.has(name),
		[expanded]
	);
	const onToggle = useCallback(
		(name: string) =>
			setExpanded((previous) => {
				const next = new Set(previous);
				if (!next.delete(name)) next.add(name);
				return next;
			}),
		[]
	);
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
					onCardClick?.(event.payload.card, event.payload.group);
					break;
				case CardInteractionEventType.MANAGE:
					onManagePrintings?.(event.payload);
					break;
				case CardInteractionEventType.HOVER:
					setImageSource(event.payload);
					break;
				case CardInteractionEventType.LEAVE:
					setImageSource(null);
					break;
			}
		},
		[onCardClick, onManagePrintings, setImageSource]
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
				{multiPrintNames.length > 0 && (
					<div className={styles['toolbar']}>
						<span id="printings-view-label">Printings</span>
						<div
							className={styles['view-toggle']}
							role="group"
							aria-labelledby="printings-view-label"
						>
							<button
								type="button"
								aria-pressed={!allExpanded}
								onClick={() => setExpanded(new Set())}
							>
								Collapsed
							</button>
							<button
								type="button"
								aria-pressed={allExpanded}
								onClick={() =>
									setExpanded(new Set(multiPrintNames))
								}
							>
								Expanded
							</button>
						</div>
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
						isExpanded={isExpanded}
						onToggle={onToggle}
						onCardEvent={onCardEvent}
					/>
					<DecklistGroup
						groups={Object.keys(deck.cardCategories)
							.filter((x) => x.indexOf('Land') !== -1)
							.map((groupName) => ({
								name: groupName,
								groupData: deck.cardCategories[groupName]
							}))}
						isExpanded={isExpanded}
						onToggle={onToggle}
						onCardEvent={onCardEvent}
					/>
				</div>
			</div>
		</div>
	);
}

import React, { useCallback, useMemo, useState } from 'react';
import {
	CardInteractionEvent,
	CardInteractionEventType
} from './DecklistGroup';
import { DecklistSection, expandedRowKey } from './DecklistSection';
import type { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import { DECK_BOARD_ORDER } from '../../utils/deck-boards';
import type { BoardProps } from '../board.types';
import type { DecklistSpotlightProps } from '../decklist-spotlight';

import styles from './decklist-board.module.css';
import { SpotlightCard } from '../../widgets/SpotlightCard/SpotlightCard';
import { groupDeckCardsByName } from '../../utils/group-deck-cards';

export type DecklistCardInfo = FetchAPIDeckCardResponse;
/** Each deck board is listed separately, in DECK_BOARD_ORDER. */
export type DecklistBoardProps = BoardProps & DecklistSpotlightProps;

/** The default deck view: rows by card type, with a card preview on hover. */
export function DecklistBoard(props: DecklistBoardProps) {
	const {
		cards,
		banner,
		bannerCrop,
		bannerBlend,
		topStyle,
		onCardEvent,
		busyGroup
	} = props;
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set()
	);
	// Rows with more than one printing, the only ones that expand, in every board.
	const multiPrintNames = useMemo(
		() =>
			DECK_BOARD_ORDER.flatMap((board) =>
				Object.values(cards[board].cardCategories).flatMap(
					(category) =>
						groupDeckCardsByName(category.cards)
							.filter((group) => group.printings.length > 1)
							.map((group) => expandedRowKey(board, group.name))
				)
			),
		[cards]
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

	const onRowEvent = useCallback(
		(event: CardInteractionEvent) => {
			switch (event.type) {
				case CardInteractionEventType.CLICK:
					onCardEvent({ type: 'view', ...event.payload });
					break;
				case CardInteractionEventType.MANAGE:
					onCardEvent({ type: 'edit', group: event.payload });
					break;
				case CardInteractionEventType.MOVE:
					onCardEvent({ type: 'move', group: event.payload });
					break;
				case CardInteractionEventType.HOVER:
					setImageSource(event.payload);
					break;
				case CardInteractionEventType.LEAVE:
					setImageSource(null);
					break;
			}
		},
		[onCardEvent, setImageSource]
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
				{DECK_BOARD_ORDER.map((board) => (
					<DecklistSection
						key={board}
						board={board}
						deck={cards[board]}
						busyName={
							busyGroup?.board === board ? busyGroup.name : null
						}
						isExpanded={isExpanded}
						onToggle={onToggle}
						onCardEvent={onRowEvent}
					/>
				))}
			</div>
		</div>
	);
}

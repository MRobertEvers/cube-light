import React, { useCallback, useMemo, useState, type ComponentType } from 'react';
import {
	CardInteractionEvent,
	CardInteractionEventType
} from './DecklistGroup';
import { DecklistSection, expandedRowKey } from './DecklistSection';
import type { DeckBoard, DeckCardEntry } from '../../../../domain/models/deck';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { DECK_BOARD_LABELS, DECK_BOARD_ORDER } from '../../../../domain/deck/boards';
import type { BoardProps, BoardSection } from '../board.types';
import type { DecklistSpotlightProps } from '../decklist-spotlight';
import type { CardHoverPreviewProps } from '../../CardPreviewer/card-previewer.types';

import styles from './decklist-board.module.css';
import { SpotlightCard } from '../../SpotlightCard/SpotlightCard';
import { groupDeckCardsByName } from '../../../../domain/deck/group-deck-cards';

export type DecklistCardInfo = DeckCardEntry;
/** Each deck board is listed separately, in DECK_BOARD_ORDER. */
export type DecklistBoardProps = BoardProps &
	DecklistSpotlightProps & {
		/** What shows beside the row under the pointer; the widget picks it for the connection. */
		HoverPreview: ComponentType<CardHoverPreviewProps>;
	};

/** Names of the cards on a board that have more than one printing. */
function multiPrintingNames(board: BoardGroups): string[] {
	const categories = Object.values(board.cardCategories);
	const groups = categories.flatMap((category) =>
		groupDeckCardsByName(category.cards)
	);
	return groups
		.filter((group) => group.printings.length > 1)
		.map((group) => group.name);
}

const DECK_SECTIONS: readonly BoardSection[] = DECK_BOARD_ORDER.map((board) => ({ board, label: DECK_BOARD_LABELS[board] }));

/** Keys of the rows that can expand, the ones with more than one printing, in every listed board. */
function expandableRowKeys(cards: Record<DeckBoard, BoardGroups>, boards: readonly DeckBoard[]): string[] {
	return boards.flatMap((board) =>
		multiPrintingNames(cards[board]).map((name) =>
			expandedRowKey(board, name)
		)
	);
}

const HOVER_CARD = { width: 300, height: 420 };
/** The closest the hover card comes to the viewport's edges. */
const HOVER_MARGIN = 16;

type Point = { x: number; y: number };
type Size = { width: number; height: number };

/** `value` kept within [minimum, maximum]; `minimum` wins when the range is empty. */
function clamp(value: number, minimum: number, maximum: number) {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function viewportSize(): Size {
	if (typeof window === 'undefined') return { width: 1200, height: 800 };
	return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Where the hover card goes for a pointer: left of it when there is room, otherwise
 * to its right, and a little above it; always inside the viewport's margins.
 */
function hoverCardPosition(pointer: Point, viewport: Size) {
	const fitsLeft = pointer.x > HOVER_CARD.width + 40;
	const left = fitsLeft
		? pointer.x - HOVER_CARD.width - HOVER_MARGIN
		: pointer.x + 120;
	const top = pointer.y - 170;
	return {
		left: clamp(
			left,
			HOVER_MARGIN,
			viewport.width - HOVER_CARD.width - HOVER_MARGIN
		),
		top: clamp(
			top,
			HOVER_MARGIN,
			viewport.height - HOVER_CARD.height - HOVER_MARGIN
		)
	};
}

/** The default deck view: rows by card type, with a card preview on hover. */
export function DecklistBoard(props: DecklistBoardProps) {
	const { cards, banner, bannerCrop, bannerBlend, topStyle, onCardEvent, annotations, sections = DECK_SECTIONS, HoverPreview } =
		props;

	const [expanded, setExpanded] = useState<ReadonlySet<string>>(
		() => new Set()
	);

	const expandableKeys = useMemo(
		() => expandableRowKeys(cards, sections.map((section) => section.board)),
		[cards, sections]
	);

	const allExpanded =
		expandableKeys.length > 0 &&
		expandableKeys.every((key) => expanded.has(key));
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
					onCardEvent({
						type: 'view',
						card: event.payload.card,
						group: event.payload.group
					});
					break;
				case CardInteractionEventType.MANAGE:
					onCardEvent({ type: 'edit', group: event.payload });
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
	const hover = imageSource
		? hoverCardPosition(imageSource.position, viewportSize())
		: { left: 0, top: 0 };

	return (
		<div className={styles['body']}>
			<div
				className={
					styles['hover-card'] +
					(imageSource ? ` ${styles['hover-card-visible']}` : '')
				}
				style={{
					left: hover.left,
					top: hover.top
				}}
			>
				{imageSource && <HoverPreview card={imageSource.card} />}
			</div>
			<div className={styles['decklist-container']}>
				{banner && topStyle === 'card' && (
					<div className={styles['decklist-spotlight']}>
						<SpotlightCard
							art={banner.art}
							artInfo={banner.artInfo}
							name={banner.name}
							crop={bannerCrop}
							bannerBlend={bannerBlend}
						/>
					</div>
				)}
				{expandableKeys.length > 0 && (
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
									setExpanded(new Set(expandableKeys))
								}
							>
								Expanded
							</button>
						</div>
					</div>
				)}
				{sections.map((section) => (
					<DecklistSection
						key={section.board}
						board={section.board}
						label={section.label}
						empty={section.empty}
						deck={cards[section.board]}
						annotations={annotations}
						isExpanded={isExpanded}
						onToggle={onToggle}
						onCardEvent={onRowEvent}
					/>
				))}
			</div>
		</div>
	);
}

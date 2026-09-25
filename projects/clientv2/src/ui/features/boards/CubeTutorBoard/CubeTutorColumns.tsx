import React, { useMemo } from 'react';
import type { DeckCardEntry } from '../../../../domain/models/deck';
import { DECK_BOARD_LABELS, DECK_BOARD_ORDER } from '../../../../domain/deck/boards';
import {
	type CubeTutorColumn,
	groupCubeTutorCards
} from '../../../../domain/deck/group-cube-tutor-cards';
import { type DeckCardGroup, manaValue } from '../../../../domain/deck/group-deck-cards';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey, type RowOwnership } from '../../../../domain/library/ownership';
import type { BoardProps } from '../board.types';
import styles from './cube-tutor-board.module.css';

const PREVIEW_WIDTH = 250;
const PREVIEW_HEIGHT = 350;

/** The card shown on hover, and the row it sits beside. */
export type CubeTutorPreview = { card: DeckCardEntry; row: DOMRect };

export type CubeTutorColumnsProps = BoardProps & {
	onPreview: (preview: CubeTutorPreview | null) => void;
};

function allCards(deck: BoardGroups): DeckCardEntry[] {
	return Object.values(deck.cardCategories).flatMap((group) => group.cards);
}

/** Beside the row, on whichever side has room, kept inside the viewport. */
export function previewPosition(row: DOMRect): React.CSSProperties {
	const left =
		row.right + PREVIEW_WIDTH + 16 <= window.innerWidth
			? row.right + 8
			: row.left - PREVIEW_WIDTH - 8;
	const top = Math.min(
		Math.max(8, row.top - PREVIEW_HEIGHT / 3),
		window.innerHeight - PREVIEW_HEIGHT - 8
	);
	return { left: Math.max(8, left), top: Math.max(8, top) };
}

function CardRow(props: {
	group: DeckCardGroup;
	/** First card of a new mana value within its section. */
	newTier: boolean;
	busy: boolean;
	owned?: RowOwnership;
	onView: (group: DeckCardGroup) => void;
	onPreview: (preview: CubeTutorPreview | null) => void;
}) {
	const { group, newTier, busy, owned, onView, onPreview } = props;
	const card = group.printings[0];
	function show(event: React.SyntheticEvent<HTMLElement>) {
		onPreview({ card, row: event.currentTarget.getBoundingClientRect() });
	}
	return (
		<li className={newTier ? styles.tier : undefined}>
			<button
				type="button"
				className={styles.row}
				disabled={busy}
				aria-label={`Open ${group.name}${group.count > 1 ? `, ${group.count} copies` : ''}`}
				onClick={() => onView(group)}
				onMouseEnter={show}
				onFocus={show}
				onMouseLeave={() => onPreview(null)}
				onBlur={() => onPreview(null)}
			>
				{group.count > 1 && (
					<span className={styles.count}>{group.count}</span>
				)}
				<span className={styles.name}>{group.name}</span>
				{owned && <OwnershipBadge row={owned} compact />}
			</button>
		</li>
	);
}

function Column(props: {
	column: CubeTutorColumn;
	busyName: string | null;
	ownership?: Record<string, RowOwnership>;
	onView: (group: DeckCardGroup) => void;
	onPreview: (preview: CubeTutorPreview | null) => void;
}) {
	const { column, busyName, ownership, onView, onPreview } = props;
	return (
		<section
			className={styles.column}
			data-color={column.key}
			aria-label={`${column.label}, ${column.count} cards`}
		>
			<h3 className={styles['column-header']}>
				{column.label} ({column.count})
			</h3>
			{column.sections.map((section) => (
				<section key={section.label} className={styles.section}>
					<h4 className={styles['section-header']}>
						{section.label} ({section.count})
					</h4>
					<ul className={styles.rows}>
						{section.groups.map((group, index) => {
							const previous = section.groups[index - 1];
							return (
								<CardRow
									key={group.name}
									group={group}
									newTier={
										!!previous &&
										manaValue(previous.printings[0].manaCost) !==
											manaValue(group.printings[0].manaCost)
									}
									busy={busyName === group.name}
									owned={ownership?.[ownedNameKey(group.name)]}
									onView={onView}
									onPreview={onPreview}
								/>
							);
						})}
					</ul>
				</section>
			))}
		</section>
	);
}

/**
 * The cube's color columns, per deck board, that both CubeTutor boards draw.
 * Hovering or focusing a name reports the card to preview beside it.
 */
export function CubeTutorColumns(props: CubeTutorColumnsProps) {
	const { cards, busyGroup, onCardEvent, annotations, onPreview } = props;
	const boards = useMemo(
		() =>
			DECK_BOARD_ORDER.map((board) => ({
				board,
				columns: groupCubeTutorCards(allCards(cards[board]))
			})).filter((entry) => entry.columns.length > 0),
		[cards]
	);
	const showBoardTitles = boards.length > 1;

	if (boards.length === 0)
		return <p className={styles.empty}>This deck is empty.</p>;

	return (
		<>
			{boards.map(({ board, columns }) => (
				<section
					key={board}
					className={styles['deck-board']}
					aria-label={DECK_BOARD_LABELS[board]}
				>
					{showBoardTitles && (
						<h2 className={styles['board-title']}>
							{DECK_BOARD_LABELS[board]}
						</h2>
					)}
					<div className={styles.columns}>
						{columns.map((column) => (
							<Column
								key={column.key}
								column={column}
								busyName={
									busyGroup?.board === board ? busyGroup.name : null
								}
								ownership={annotations?.ownership}
								onView={(group) =>
									onCardEvent({
										type: 'view',
										card: group.printings[0],
										group
									})
								}
								onPreview={onPreview}
							/>
						))}
					</div>
				</section>
			))}
		</>
	);
}

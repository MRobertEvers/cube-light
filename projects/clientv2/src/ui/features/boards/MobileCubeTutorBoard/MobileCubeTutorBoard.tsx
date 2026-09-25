import React, { useMemo, useState } from 'react';
import type {
	DeckBoard,
	DeckCardEntry
} from '../../../../domain/models/deck';
import { ManaCost } from '../../../kit/components/ManaCost/ManaCost';
import { OverflowMenu } from '../../../kit/components/OverflowMenu/OverflowMenu';
import {
	DECK_BOARD_LABELS,
	DECK_BOARD_ORDER,
	moveToBoardLabel
} from '../../../../domain/deck/boards';
import {
	type CubeTutorColumnKey,
	groupCubeTutorCards
} from '../../../../domain/deck/group-cube-tutor-cards';
import { type DeckCardGroup, manaValue } from '../../../../domain/deck/group-deck-cards';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { OwnershipBadge } from '../../../kit/components/OwnershipBadge/OwnershipBadge';
import { ownedNameKey } from '../../../../domain/library/ownership';
import type { BoardAnnotations, BoardCardKey, BoardProps } from '../board.types';
import styles from './mobile-cube-tutor-board.module.css';

export type MobileCubeTutorBoardProps = BoardProps;

function allCards(deck: BoardGroups): DeckCardEntry[] {
	return Object.values(deck.cardCategories).flatMap((group) => group.cards);
}

function CardRow(props: {
	group: DeckCardGroup;
	/** First card of a new mana value within its section. */
	newTier: boolean;
	busyGroup: BoardCardKey | null;
	annotations?: BoardAnnotations;
	onCardEvent: BoardProps['onCardEvent'];
}) {
	const { group, newTier, busyGroup, annotations, onCardEvent } = props;
	const owned = annotations?.ownership?.[ownedNameKey(group.name)];
	const card = group.printings[0];
	const busy =
		busyGroup?.board === group.board && busyGroup.name === group.name;
	return (
		<li className={newTier ? styles.tier : undefined}>
			<div className={styles.row}>
				<button
					type="button"
					className={styles['row-main']}
					disabled={busy}
					aria-label={`Open ${group.name}${group.count > 1 ? `, ${group.count} copies` : ''}`}
					onClick={() => onCardEvent({ type: 'view', card, group })}
				>
					<span className={styles.count}>{group.count}</span>
					<span className={styles.name}>{group.name}</span>
					{owned && <OwnershipBadge row={owned} compact />}
					<ManaCost cost={card.manaCost} />
				</button>
				<OverflowMenu label={`Actions for ${group.name}`} disabled={busy}>
					<button
						type="button"
						onClick={() => onCardEvent({ type: 'edit', group })}
					>
						Edit
					</button>
					<button
						type="button"
						onClick={() => onCardEvent({ type: 'move', group })}
					>
						{moveToBoardLabel(group.board)}
					</button>
					<button
						type="button"
						className={styles.delete}
						onClick={() => onCardEvent({ type: 'delete', group })}
					>
						Delete
					</button>
				</OverflowMenu>
			</div>
		</li>
	);
}

/**
 * The phone cube view: the desktop board's color columns, one at a time. Tabs
 * pick the column, and a switch picks the deck board when there is a sideboard.
 * Tap a card for details; its menu edits, moves or deletes it.
 */
export function MobileCubeTutorBoard(props: MobileCubeTutorBoardProps) {
	const { cards, busyGroup, onCardEvent, annotations } = props;
	const boards = useMemo(
		() =>
			DECK_BOARD_ORDER.map((board) => ({
				board,
				columns: groupCubeTutorCards(allCards(cards[board]))
			})).filter((entry) => entry.columns.length > 0),
		[cards]
	);
	const [chosenBoard, setChosenBoard] = useState<DeckBoard>('main');
	const [chosenColumn, setChosenColumn] = useState<CubeTutorColumnKey | null>(
		null
	);

	if (boards.length === 0)
		return <p className={styles.empty}>This deck is empty.</p>;

	// A choice that emptied out, by an edit or on another device, falls back to the first.
	const shown =
		boards.find((entry) => entry.board === chosenBoard) ?? boards[0];
	const column =
		shown.columns.find((entry) => entry.key === chosenColumn) ??
		shown.columns[0];
	const panelId = `mobile-cube-tutor-${shown.board}-${column.key}`;

	return (
		<div className={styles.board}>
			{boards.length > 1 && (
				<div
					className={styles['deck-boards']}
					role="radiogroup"
					aria-label="Deck board"
				>
					{boards.map((entry) => (
						<button
							key={entry.board}
							type="button"
							role="radio"
							aria-checked={entry.board === shown.board}
							onClick={() => setChosenBoard(entry.board)}
						>
							{DECK_BOARD_LABELS[entry.board]}
						</button>
					))}
				</div>
			)}
			<div
				className={styles.tabs}
				role="tablist"
				aria-label={`${DECK_BOARD_LABELS[shown.board]} colors`}
			>
				{shown.columns.map((entry) => (
					<button
						key={entry.key}
						type="button"
						role="tab"
						className={styles.tab}
						data-color={entry.key}
						aria-selected={entry.key === column.key}
						aria-controls={panelId}
						onClick={() => setChosenColumn(entry.key)}
					>
						{entry.label}
						<span className={styles['tab-count']}>{entry.count}</span>
					</button>
				))}
			</div>
			<section
				id={panelId}
				className={styles.column}
				data-color={column.key}
				role="tabpanel"
				aria-label={`${column.label}, ${column.count} cards`}
			>
				{column.sections.map((section) => (
					<section key={section.label} className={styles.section}>
						<h3 className={styles['section-header']}>
							{section.label}
							<span>{section.count}</span>
						</h3>
						<ul className={styles.rows}>
							{section.groups.map((group, index) => {
								const previous = section.groups[index - 1];
								return (
									<CardRow
										key={group.name}
										group={group}
										newTier={
											!!previous &&
											manaValue(
												previous.printings[0].manaCost
											) !==
												manaValue(
													group.printings[0].manaCost
												)
										}
										busyGroup={busyGroup}
										annotations={annotations}
										onCardEvent={onCardEvent}
									/>
								);
							})}
						</ul>
					</section>
				))}
			</section>
		</div>
	);
}

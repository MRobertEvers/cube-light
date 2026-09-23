import React, { useCallback } from 'react';
import type { DeckBoard } from '../../../../domain/models/deck';
import type { BoardGroups } from '../../../../domain/deck/grouping';
import { DECK_BOARD_LABELS } from '../../../../domain/deck/boards';
import { CardInteractionEvent, DecklistGroup } from './DecklistGroup';

import styles from './decklist-board.module.css';

/** Keys expanded rows by board too, since one card name can sit in both boards. */
export function expandedRowKey(board: DeckBoard, name: string): string {
	return `${board}:${name}`;
}

export type DecklistSectionProps = {
	board: DeckBoard;
	deck: BoardGroups;
	/** Takes keys from expandedRowKey. */
	isExpanded: (key: string) => boolean;
	onToggle: (key: string) => void;
	onCardEvent?: (event: CardInteractionEvent) => void;
};

/** One board of a deck: its heading and card-type groups, spells before lands. */
export function DecklistSection(props: DecklistSectionProps) {
	const { board, deck, isExpanded, onToggle, onCardEvent } = props;
	const headingId = `decklist-board-${board}`;
	const categories = Object.keys(deck.cardCategories);
	const groupsWhere = (lands: boolean) =>
		categories
			.filter((name) => name.includes('Land') === lands)
			.map((name) => ({ name, groupData: deck.cardCategories[name] }));
	const isRowExpanded = useCallback(
		(name: string) => isExpanded(expandedRowKey(board, name)),
		[board, isExpanded]
	);
	const onRowToggle = useCallback(
		(name: string) => onToggle(expandedRowKey(board, name)),
		[board, onToggle]
	);

	return (
		<section
			className={styles['board']}
			aria-labelledby={headingId}
			data-board={board}
		>
			<h2 id={headingId} className={styles['board-header']}>
				{DECK_BOARD_LABELS[board]}
				<span className={styles['board-count']}>{deck.count}</span>
			</h2>
			{deck.count === 0 ? (
				<p className={styles['board-empty']}>
					{board === 'side'
						? 'No sideboard cards yet. Use a card’s Edit button to move it here, or paste a list with a Sideboard section.'
						: 'No cards in the main board yet.'}
				</p>
			) : (
				<div className={styles['deck-list']}>
					<DecklistGroup
						groups={groupsWhere(false)}
						isExpanded={isRowExpanded}
						onToggle={onRowToggle}
						onCardEvent={onCardEvent}
					/>
					<DecklistGroup
						groups={groupsWhere(true)}
						isExpanded={isRowExpanded}
						onToggle={onRowToggle}
						onCardEvent={onCardEvent}
					/>
				</div>
			)}
		</section>
	);
}

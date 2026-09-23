import type { DeckBoard } from '../models/deck';

/** Boards in the order the deck page shows them. */
export const DECK_BOARD_ORDER: readonly DeckBoard[] = ['main', 'side'];

export const DECK_BOARD_LABELS: Record<DeckBoard, string> = {
	main: 'Main board',
	side: 'Sideboard'
};

/** The board a card moves to from `board`, while decks have exactly two. */
export function otherBoard(board: DeckBoard): DeckBoard {
	return board === 'main' ? 'side' : 'main';
}

/** Menu text for moving every copy of a card out of `board`. */
export function moveToBoardLabel(board: DeckBoard): string {
	return otherBoard(board) === 'side'
		? 'Move to sideboard'
		: 'Move to main board';
}

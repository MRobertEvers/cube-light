import { useMemo } from 'react';
import { selectDeck } from '../../../redux/decks/decks.selectors';
import { selectDeckOwnership } from '../../../redux/library/library.selectors';
import { useAppSelector } from '../../../redux/use-app-selector';
import { groupBoardCards, type BoardGroups, type GroupedDeck } from '../../../domain/deck/grouping';
import { DECK_BOARD_ORDER } from '../../../domain/deck/boards';
import { filterByOwnership, type OwnershipFilter } from '../../../domain/library/ownership';
import type { DeckBoard } from '../../../domain/models/deck';
import type { BoardAnnotations } from './board.types';

export type DeckBoardView = {
	deck: GroupedDeck;
	/** The deck's boards, holding only the cards the ownership filter lets through. */
	cards: Record<DeckBoard, BoardGroups>;
	/** Undefined until the library has been read. */
	annotations: BoardAnnotations | undefined;
};

/**
 * A deck in the store as a board shows it: its cards filtered by ownership, and how much of
 * each card name is owned. Null until the deck loads.
 */
export function useDeckBoardView(deckId: string, filterArg?: OwnershipFilter): DeckBoardView | null {
	const filter = filterArg === undefined ? 'all' : filterArg;
	const deck = useAppSelector((root) => selectDeck(root, deckId));
	const owned = useAppSelector((root) => selectDeckOwnership(root, deckId));
	return useMemo(() => {
		if (!deck) return null;
		const annotations = owned ? { ownership: owned.rows } : undefined;
		if (!owned || filter === 'all') return { deck, cards: deck.boards, annotations };
		const cards = {} as Record<DeckBoard, BoardGroups>;
		for (const board of DECK_BOARD_ORDER) {
			const entries = board === 'side' ? (deck.sideboard ?? []) : deck.cards;
			cards[board] = groupBoardCards(filterByOwnership(entries, owned.rows, filter));
		}
		return { deck, cards, annotations };
	}, [deck, owned, filter]);
}

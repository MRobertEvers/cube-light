import type { DeckBoard, FetchAPIDeckCardResponse } from '../api/fetch-api-deck';
import type { DeckCardGroup } from '../utils/group-deck-cards';
import type { DeckMappedData } from '../workers/deck.worker.messages';

/**
 * A Board is a visualization of some number of cards. Each board has a pure
 * component taking BoardProps, and a ReduxWidget that connects it to the store
 * taking BoardReduxWidgetProps.
 *
 * Not to be confused with DeckBoard, the main board and sideboard of a deck.
 */

/** A card row, named by the deck board it sits in and its card name. */
export type BoardCardKey = { board: DeckBoard; name: string };

/** What a board asks its owner to do with a card. Boards emit only the ones they support. */
export type BoardCardEvent =
	| { type: 'view'; card: FetchAPIDeckCardResponse; group: DeckCardGroup }
	| { type: 'edit'; group: DeckCardGroup }
	/** Moves every copy of the card to the other deck board. */
	| { type: 'move'; group: DeckCardGroup }
	| { type: 'delete'; group: DeckCardGroup };

/** Every board takes these; a board adds its own presentation props on top. */
export type BoardProps = {
	/** The cards to show, per deck board, grouped by card type. */
	cards: Record<DeckBoard, DeckMappedData>;
	/** The card row with an action in flight, disabled until it settles. */
	busyGroup: BoardCardKey | null;
	onCardEvent: (event: BoardCardEvent) => void;
};

/**
 * Every board's ReduxWidget takes these. The widget reads the deck and handles
 * card edits through the store; opening dialogs stays with the page.
 */
export type BoardReduxWidgetProps = {
	deckId: string;
	onViewCard: (card: FetchAPIDeckCardResponse, group: DeckCardGroup) => void;
	onEditCard: (group: DeckCardGroup) => void;
};

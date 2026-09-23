import type { DeckBoard, DeckCardEntry } from '../../../domain/models/deck';
import type { DeckCardGroup } from '../../../domain/deck/group-deck-cards';
import type { BannerCrop } from '../../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../../domain/appearance/deck-top-style';
import type {
	BoardGroups,
	GroupedDeck
} from '../../../domain/deck/grouping';
import type { DeckView } from '../deck-chrome/DeckViewSwitch';

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
	| { type: 'view'; card: DeckCardEntry; group: DeckCardGroup }
	| { type: 'edit'; group: DeckCardGroup }
	/** Moves every copy of the card to the other deck board. */
	| { type: 'move'; group: DeckCardGroup }
	| { type: 'delete'; group: DeckCardGroup };

/** Every board takes these; a board adds its own presentation props on top. */
export type BoardProps = {
	/** The cards to show, per deck board, grouped by card type. */
	cards: Record<DeckBoard, BoardGroups>;
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
	onViewCard: (card: DeckCardEntry, group: DeckCardGroup) => void;
	onEditCard: (group: DeckCardGroup) => void;
};

/**
 * Every visualization's controls take these: the deck page's banner, view tabs,
 * card-adding and deck actions, and status, arranged for that visualization.
 */
export type BoardControlsProps = {
	deck: GroupedDeck;
	deckId: string;
	view: DeckView;
	/** With a full-art top the deck's art already spans the page above the controls. */
	topStyle: DeckTopStyle;
	bannerCrop: BannerCrop;
	previewIcon: string | null;
	isSaving: boolean;
	/** Failed renames and card edits, shown near the controls. */
	errors: string[];
	/** The element whose scrolling out of view shows the deck name in the app header. */
	onBannerElement: (element: HTMLElement | null) => void;
	onAddCard: () => void;
	onAddCards: () => void;
	onImportImage: () => void;
	onEditName: () => void;
	onDeleteDeck: () => void;
};

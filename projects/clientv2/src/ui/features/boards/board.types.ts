import type { DeckBoard, DeckCardEntry } from '../../../domain/models/deck';
import type { DeckCardGroup } from '../../../domain/deck/group-deck-cards';
import type { BannerCrop } from '../../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../../domain/appearance/deck-top-style';
import type {
	BoardGroups,
	GroupedDeck
} from '../../../domain/deck/grouping';
import type { DeckView } from '../deck-chrome/DeckViewSwitch';
import type { DeckOwnershipSummary, OwnershipFilter, RowOwnership } from '../../../domain/library/ownership';
import type { BoardChip } from '../../kit/components/OwnershipBadge/OwnershipBadge';

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

export type { BoardChip };

/**
 * Extras about the cards a board shows, which its owner works out. A board shows
 * the ones it supports and draws exactly as before without them.
 */
export type BoardAnnotations = {
	/** How much of each card name the owned collections cover, keyed by `ownedNameKey`. */
	ownership?: Record<string, RowOwnership>;
	/** Chips for each printing, by UUID. */
	printingChips?: Record<string, BoardChip[]>;
};

/** One list a board shows: a deck board, what it is called, and what to say while it is empty. */
export type BoardSection = { board: DeckBoard; label: string; empty?: string };

/** Every board takes these; a board adds its own presentation props on top. */
export type BoardProps = {
	/** The cards to show, per deck board, grouped by card type. */
	cards: Record<DeckBoard, BoardGroups>;
	/** The card row with an action in flight, disabled until it settles. */
	busyGroup: BoardCardKey | null;
	onCardEvent: (event: BoardCardEvent) => void;
	annotations?: BoardAnnotations;
	/**
	 * The deck boards to list, in order, and what to call each. Defaults to a deck's
	 * main and side boards; a collection lists one board of its own.
	 */
	sections?: readonly BoardSection[];
	/** What the row menu's move action says. Defaults to moving to the deck's other board. */
	moveLabel?: string;
	/** What the row menu's delete action says. Defaults to "Delete". */
	deleteLabel?: string;
};

/**
 * Every board's ReduxWidget takes these. The widget reads the deck and handles
 * card edits through the store; opening dialogs stays with the page.
 */
export type BoardReduxWidgetProps = {
	deckId: string;
	/** Shows only the cards with this ownership; every card by default. */
	ownershipFilter?: OwnershipFilter;
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
	/** How much of the deck the owned collections cover; null until the library is read. */
	ownership: DeckOwnershipSummary | null;
	/** Shows only the cards with this ownership, or every card. */
	ownershipFilter: OwnershipFilter;
	onOwnershipFilter: (filter: OwnershipFilter) => void;
	/** Opens the choice of collection to add the deck's missing cards to. */
	onAddMissing: () => void;
};

export type { OwnershipFilter };

import type { DeckBoard, DeckSummaries } from '../../domain/models/deck';
import type { GroupedDeck } from '../../domain/deck/grouping';
import type { DeckCardGroup } from '../../domain/deck/group-deck-cards';
import type { DeckCardStep } from '../../domain/deck/card-steps';

export type DecksState = {
	list: DeckSummaries | null;
	byId: Record<string, GroupedDeck>;
	listError: string | null;
	errorsById: Record<string, string>;
	listRequestId: string | null;
	requestIdsById: Record<string, string>;
	listRevision: number;
	revisionsById: Record<string, number>;
	/** Card row edits made from a board, one at a time per deck. */
	cardActionsById: Record<string, DeckCardAction>;
};

export type DeckCardAction = {
	/** The card row with an edit in flight. */
	busy: { board: DeckBoard; name: string } | null;
	error: string | null;
};

export type DeckCardGroupInput = { deckId: string; group: DeckCardGroup };

export type DeckCardSteps = { deckId: string; steps: DeckCardStep[] };

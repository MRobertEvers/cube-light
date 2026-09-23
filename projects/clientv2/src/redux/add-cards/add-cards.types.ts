import type { DeckBoard } from '../../domain/models/deck';

export type AddCardsState = {
	open: boolean;
	deckId: string | null;
	text: string;
	/** Where lines before any Deck or Sideboard heading go. */
	board: DeckBoard;
	submitting: boolean;
	error: string | null;
	// Lowercased names the server couldn't resolve on the last submit.
	unknownCards: string[];
};

export type ImportRejection = { message: string; unknownCards: string[] };

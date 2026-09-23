import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';
import type { DeckBoard } from '@torimtg/core';

export type DeckCardsEdit = {
	/** The board both lists apply to. Defaults to the main board. */
	board?: DeckBoard;
	/** Printings to take out of the deck entirely. */
	remove: string[];
	/** Printings to set to an exact count, adding them when missing. Counts must be above 0. */
	upsert: Array<{ uuid: string; count: number }>;
};

/** Applies several printing changes to a deck as one edit. */
export async function fetchAPIEditDeckCards(
	deckId: string,
	edit: DeckCardsEdit
): Promise<void> {
	const request = await fetchTimeout(
		`${API_URI}/decks/${deckId}/cards/edit`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			body: JSON.stringify(edit)
		}
	);

	if (!request.ok) {
		throw new Error(`Unable to update cards (${request.status})`);
	}
}

export type DeckCardsMove = {
	from: DeckBoard;
	to: DeckBoard;
	/** Copies of each printing to take out of `from` and put into `to`. */
	cards: Array<{ uuid: string; count: number }>;
};

/** Moves copies between two boards of a deck as one edit, so neither board is ever saved alone. */
export async function fetchAPIMoveDeckCards(
	deckId: string,
	move: DeckCardsMove
): Promise<void> {
	const request = await fetchTimeout(
		`${API_URI}/decks/${deckId}/cards/move`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			body: JSON.stringify(move)
		}
	);

	if (!request.ok) {
		throw new Error(`Unable to move cards (${request.status})`);
	}
}

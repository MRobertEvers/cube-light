import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export type DeckCardsEdit = {
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

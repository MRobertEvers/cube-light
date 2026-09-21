import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';
import type { DeckTopStyle } from '../utils/deck-top-style';

export async function fetchAPISetTopStyle(
	deckId: string,
	topStyle: DeckTopStyle
): Promise<void> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}/top-style`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ topStyle })
	});
	if (!response.ok)
		throw new Error(`Unable to save deck top style (${response.status})`);
}

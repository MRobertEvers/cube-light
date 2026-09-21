import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';
import type { CardPalette } from '../utils/card-palette';

export async function fetchAPISetDeckPalette(
	deckId: string,
	palette: CardPalette | null
): Promise<void> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}/palette`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ palette })
	});
	if (!response.ok)
		throw new Error(`Unable to save deck palette (${response.status})`);
}

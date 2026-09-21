import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export async function fetchAPIUpdateDeck(
	deckId: string,
	name: string,
	bannerCardUuid?: string
): Promise<void> {
	const response = await apiFetch(`${API_URI}/decks/${deckId}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name,
			...(bannerCardUuid ? { bannerCardUuid } : {})
		})
	});
	if (!response.ok)
		throw new Error(`Unable to save deck (${response.status})`);
}

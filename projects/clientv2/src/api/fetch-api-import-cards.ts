import { API_URI } from '../config/api-url';

export type ImportedCard = { name: string; count: number };

export async function fetchAPIImportCards(
	deckId: string,
	cards: ImportedCard[]
): Promise<void> {
	const response = await fetch(`${API_URI}/decks/${deckId}/cards/import`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cards })
	});
	if (!response.ok) {
		const details = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(details?.error || 'Could not add cards to the deck');
	}
}

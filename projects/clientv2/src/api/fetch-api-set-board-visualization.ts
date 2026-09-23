import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export async function fetchAPISetBoardVisualization(
	deckId: string,
	boardVisualization: string
): Promise<void> {
	const response = await apiFetch(
		`${API_URI}/decks/${deckId}/board-visualization`,
		{
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ boardVisualization })
		}
	);
	if (!response.ok)
		throw new Error(
			`Unable to save deck board visualization (${response.status})`
		);
}

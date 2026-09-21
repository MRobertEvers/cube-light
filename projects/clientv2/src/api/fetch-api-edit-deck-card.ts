import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';

export async function fetchAPIEditDeckCard(
	deckId: string,
	previousUuid: string,
	uuid: string,
	count: number
): Promise<void> {
	const request = await fetchTimeout(
		`${API_URI}/decks/${deckId}/cards/edit`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			body: JSON.stringify({
				remove: previousUuid === uuid ? [] : [previousUuid],
				upsert: [{ uuid, count }]
			})
		}
	);

	if (!request.ok) {
		throw new Error(`Unable to update card (${request.status})`);
	}
}

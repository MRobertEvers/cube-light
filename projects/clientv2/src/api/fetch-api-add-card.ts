import { API_URI } from '../config/api-url';
import { fetchTimeout } from './utils';
import type { DeckBoard } from '@torimtg/core';

export type AddCardResponse = boolean;
export async function fetchAPIAddCard(
	deckId: string,
	cardName: string,
	/** Copies for each board, saved as one edit. Boards left out get none. */
	counts: Partial<Record<DeckBoard, number>>
): Promise<AddCardResponse> {
	const request = await fetchTimeout(`${API_URI}/decks/${deckId}/cards`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: JSON.stringify({
			cardName: cardName,
			counts: counts
		})
	});

	return request.ok as AddCardResponse;
}

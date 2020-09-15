import { API_URI } from '../config/api-url';

export type SetCardResponse = null;
export type SetCardAction = 'add' | 'remove' | 'set';
export async function fetchSetCard(
	deckId: string,
	cardName: string,
	action: SetCardAction,
	count: number
): Promise<SetCardResponse> {
	const body = JSON.stringify({
		cardName: cardName,
		action: action,
		count: count
	});

	const options = {
		method: 'POST' as 'POST',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8'
		},
		body: body
	};

	const request = await fetch(`${API_URI}/decks/${deckId}/cards`, options);

	return null;
}

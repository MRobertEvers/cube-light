import { xhrFetch } from './xhr-fetch';

export type AddCardResponse = null;
export async function fetchAddCard(deckId: string, cardName: string): Promise<AddCardResponse> {
	return new Promise((resolve, reject) => {
		const body = JSON.stringify({
			cardName: cardName
		});

		const options = {
			method: 'POST' as 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			body: body
		};

		xhrFetch(`http://localhost:4040/deck/${deckId}/cards`, options, (xhr: XMLHttpRequest) => {
			const state = xhr.readyState;
			switch (state) {
				case XMLHttpRequest.OPENED:
					break;
				case XMLHttpRequest.HEADERS_RECEIVED:
					break;
				case XMLHttpRequest.LOADING:
					break;
				case XMLHttpRequest.DONE:
					resolve();
					break;
			}
		});
	});
}
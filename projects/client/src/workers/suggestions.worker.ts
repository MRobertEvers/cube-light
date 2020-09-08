import { xhrFetch } from './xhr-fetch';
let currentStr = '';
// This is the service worker entry point.
onmessage = (event: MessageEvent) => {
	const messageType = event.data.type;
	if (messageType === 'suggest') {
		xhrFetch(
			`http://localhost:4040/suggest?stub=${event.data.payload}`,
			{
				method: 'GET'
			},
			(xhr: XMLHttpRequest) => {
				let data = event.data;
				const state = xhr.readyState;
				switch (state) {
					case XMLHttpRequest.OPENED:
						break;
					case XMLHttpRequest.HEADERS_RECEIVED:
						break;
					case XMLHttpRequest.LOADING:
						break;
					case XMLHttpRequest.DONE:
						const suggestionArray = JSON.parse(xhr.responseText);
						const deduped = new Set(suggestionArray);
						const sorted = Array.from(deduped).sort();

						const result = {
							type: messageType,
							sorted: sorted,
							set: new Set(sorted.map((item) => item.toLowerCase()))
						};
						postMessage(result);
						break;
				}
			}
		);
	} else {
		let cardName = event.data.cardName;
		let body = JSON.stringify({
			cardName: cardName
		});
		let options = {
			method: 'POST' as 'POST',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8'
			},
			body: body
		};
		xhrFetch(`http://localhost:4040/deck/1/cards`, options, (xhr: XMLHttpRequest) => {
			let data = event.data;
			const state = xhr.readyState;
			switch (state) {
				case XMLHttpRequest.OPENED:
					break;
				case XMLHttpRequest.HEADERS_RECEIVED:
					break;
				case XMLHttpRequest.LOADING:
					break;
				case XMLHttpRequest.DONE:
					postMessage({
						type: messageType
					});
					break;
			}
		});
	}
};

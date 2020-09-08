import { xhrFetch } from './xhr-fetch';
let currentStr = '';
// This is the service worker entry point.
onmessage = (event: MessageEvent) => {
	const messageType = event.data;
	xhrFetch(
		`http://localhost:4040/suggest?stub=${event.data}`,
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
					postMessage(xhr.responseText);
					break;
			}
		}
	);
};

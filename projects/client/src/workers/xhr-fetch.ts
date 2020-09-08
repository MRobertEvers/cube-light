import { XHRFetchInit } from './xhr-fetch.types';

export function xhrFetch(url: string, options?: XHRFetchInit, onreadystatechange?: (xhr: XMLHttpRequest) => any) {
	const { method, headers, body, credentials } = options || {};

	const request = new XMLHttpRequest();

	request.withCredentials = credentials === 'include';

	for (const header in headers || {}) {
		request.setRequestHeader(header, headers[header]);
	}

	// IE 11 does not support 'json' type
	// request.responseType = "json";
	// Just use the default type ('text') and JSON.parse it if you need json.
	request.onreadystatechange = function () {
		onreadystatechange(request);
	};

	request.open(method || 'GET', url);
	request.send(body);
}

export async function fetchTimeout(
	input: RequestInfo,
	init?: RequestInit & {
		timeout?: number;
	}
): Promise<Response> {
	const options: RequestInit & { timeout?: number } = init || {};
	const timeout = options.timeout === undefined ? 10000 : options.timeout;
	const otherInit: RequestInit = {
		body: options.body,
		cache: options.cache,
		credentials: options.credentials,
		headers: options.headers,
		integrity: options.integrity,
		keepalive: options.keepalive,
		method: options.method,
		mode: options.mode,
		redirect: options.redirect,
		referrer: options.referrer,
		referrerPolicy: options.referrerPolicy,
		signal: options.signal,
		window: options.window
	};
	return new Promise(async (resolve, reject) => {
		const t = setTimeout(() => {
			reject('Query Timed Out');
		}, timeout);

		try {
			const result = await fetch(input, otherInit);
			resolve(result);
		} catch (e) {
			reject(e);
		} finally {
			clearTimeout(t);
		}
	});
}

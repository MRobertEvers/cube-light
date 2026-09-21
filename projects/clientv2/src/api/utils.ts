type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Called whenever the server answers 401, meaning the session has ended. Returns an unsubscribe. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
	unauthorizedListeners.add(listener);
	return () => unauthorizedListeners.delete(listener);
}

/**
 * fetch for the backend: sends the session cookie (the backend is on another port,
 * so it is cross-origin) and reports a 401 so the app can ask the user to sign in.
 */
export async function apiFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const response = await fetch(input, { credentials: 'include', ...init });
	if (response.status === 401)
		for (const listener of unauthorizedListeners) listener();
	return response;
}

export async function fetchTimeout(
	input: RequestInfo,
	init?: RequestInit & {
		timeout?: number;
	}
): Promise<Response> {
	const { timeout = 10000, ...otherInit } = init || {};
	return new Promise(async (resolve, reject) => {
		const t = setTimeout(() => {
			reject('Query Timed Out');
		}, timeout);

		try {
			const result = await apiFetch(input, otherInit);
			resolve(result);
		} catch (e) {
			reject(e);
		} finally {
			clearTimeout(t);
		}
	});
}

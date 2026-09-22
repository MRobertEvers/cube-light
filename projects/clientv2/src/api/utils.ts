import { localApiRequest } from '../torimtg/ui-api';
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function reportUnauthorized(): void { for (const listener of unauthorizedListeners) listener(); }

/** Called whenever the server answers 401, meaning the session has ended. Returns an unsubscribe. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
	unauthorizedListeners.add(listener);
	return function () {
		return unauthorizedListeners.delete(listener);
	};
}

/**
 * Compatibility entry point into Redux/ToriMTG. No networking occurs here.
 * The worker's server adapter owns bearer authentication and token rotation.
 */
export async function apiFetch(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const response = await localApiRequest(input, init);
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
	// The core owns durable refresh deadlines. A UI timeout must not cancel a saved command.
	return apiFetch(input, init);
}

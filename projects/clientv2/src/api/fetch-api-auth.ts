import { API_URI } from '../config/api-url';
import { apiFetch } from './utils';

export type ProfileCrop = { x: number; y: number; zoom: number };
export type UserProfile = {
	cardName: string;
	cardUuid: string;
	art: string;
	crop: ProfileCrop;
};
export type AuthUser = {
	id: number;
	username: string;
	profile: UserProfile | null;
};

export type FetchAPISessionResponse = {
	user: AuthUser | null;
	/** No account exists yet, so the first sign-in creates one. */
	setupRequired: boolean;
};

export async function fetchAPISession(): Promise<FetchAPISessionResponse> {
	const response = await apiFetch(`${API_URI}/auth/session`);
	if (!response.ok) throw new Error('Could not reach the server.');
	return response.json() as Promise<FetchAPISessionResponse>;
}

/**
 * Signs in, or with `setup` creates the server's first account. The server answers
 * with an HttpOnly session cookie that the browser sends on later requests.
 */
export async function fetchAPISignIn(
	username: string,
	password: string,
	setupArg?: boolean
): Promise<AuthUser> {
	const setup = setupArg === undefined ? false : setupArg;

	const response = await apiFetch(
		`${API_URI}/auth/${setup ? 'setup' : 'login'}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username, password })
		}
	);
	const body = (await response.json().catch(() => ({}))) as {
		user?: AuthUser;
		error?: string;
	};
	if (!response.ok || !body.user)
		throw new Error(body.error || 'Could not sign in. Try again.');
	return body.user;
}

export async function fetchAPISignOut(): Promise<void> {
	await apiFetch(`${API_URI}/auth/logout`, { method: 'POST' });
}

export async function fetchAPISetProfile(
	profile: UserProfile
): Promise<AuthUser> {
	const response = await apiFetch(`${API_URI}/auth/profile`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(profile)
	});
	const body = (await response.json().catch(() => ({}))) as {
		user?: AuthUser;
		error?: string;
	};
	if (!response.ok || !body.user)
		throw new Error(body.error || 'Could not save your profile.');
	return body.user;
}

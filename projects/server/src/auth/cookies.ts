import type { Request, Response } from 'express';
import { SESSION_TTL_MS } from './sessions';

export const SESSION_COOKIE = 'cube_session';

export function readCookie(req: Request, name: string): string | null {
	const header = req.headers.cookie;
	if (!header) return null;
	for (const pair of header.split(';')) {
		const separator = pair.indexOf('=');
		if (separator !== -1 && pair.slice(0, separator).trim() === name)
			return pair.slice(separator + 1).trim();
	}
	return null;
}

/**
 * HttpOnly keeps the ID away from page scripts. SameSite=Lax still sends it from the
 * client on another port of the same host, including <img> requests, but not from other sites.
 * Secure is added whenever the request arrived over HTTPS.
 */
function cookie(req: Request, value: string, maxAgeSeconds: number): string {
	return [
		`${SESSION_COOKIE}=${value}`,
		'Path=/',
		`Max-Age=${maxAgeSeconds}`,
		'HttpOnly',
		'SameSite=Lax',
		...(req.secure ? ['Secure'] : [])
	].join('; ');
}

export function setSessionCookie(req: Request, res: Response, id: string): void {
	res.setHeader('Set-Cookie', cookie(req, id, SESSION_TTL_MS / 1000));
}

export function clearSessionCookie(req: Request, res: Response): void {
	res.setHeader('Set-Cookie', cookie(req, '', 0));
}

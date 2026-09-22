import type { NextFunction, Request, Response } from 'express';
import { readCookie, SESSION_COOKIE, setSessionCookie } from './cookies';
import { Session, SessionStore } from './sessions';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostname(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

/**
 * Origins allowed to send the session cookie: CLIENT_ORIGINS (comma-separated) when set,
 * otherwise any page on the same host as the server, which is how the client finds it.
 */
function originAllowed(origin: string, req: Request): boolean {
	const configured = process.env.CLIENT_ORIGINS;
	if (configured)
		return configured
			.split(',')
			.map((entry) => entry.trim())
			.includes(origin);
	const own = req.headers.host && hostname(`http://${req.headers.host}`);
	return !!own && hostname(origin) === own;
}

/**
 * Allowed origins get credentialed CORS; everyone else still reads public data with
 * `*`, which browsers never pair with cookies. Pages from other origins cannot make
 * changes: they are refused before any route runs.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
	const origin = req.headers.origin;
	const allowed = !!origin && originAllowed(origin, req);
	res.setHeader('Vary', 'Origin');
	res.setHeader('Access-Control-Allow-Origin', allowed ? origin! : '*');
	if (allowed) res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
	if (req.method === 'OPTIONS') {
		res.sendStatus(204);
		return;
	}
	if (origin && !allowed && !SAFE_METHODS.has(req.method)) {
		res.status(403).json({ error: 'Origin not allowed' });
		return;
	}
	next();
}

export function currentSession(res: Response): Session | undefined {
	return res.locals.session;
}

/** Attaches the cookie's session, if any, to res.locals and renews its expiry. */
export function loadSession(sessions: SessionStore) {
	return function (req: Request, res: Response, next: NextFunction): void {
		const id = readCookie(req, SESSION_COOKIE);
		const found = id ? sessions.get(id) : null;
		if (id && found) {
			res.locals.session = found.session;
			res.locals.sessionId = id;
			if (found.renewed) setSessionCookie(req, res, id);
		}
		next();
	};
}

/** Answers 401 unless there is a session or the path starts with one of publicPrefixes. */
export function requireSession(publicPrefixes: string[]) {
	return function (req: Request, res: Response, next: NextFunction): void {
		const open = publicPrefixes.some(
			(prefix) => req.path === prefix || req.path.startsWith(prefix + '/')
		);
		if (open || currentSession(res)) {
			next();
			return;
		}
		res.status(401).json({ error: 'Sign in required' });
	};
}

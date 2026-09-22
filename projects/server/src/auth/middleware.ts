import type { NextFunction, Request, Response } from 'express';
import { TokenStore } from './tokens';
type Session = { userId: number; username: string };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostname(url: string): string | null {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}

/**
 * Origins allowed to call authenticated endpoints: CLIENT_ORIGINS when set,
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
 * Allowed origins can send bearer headers; everyone else can read public data.
 * Pages from other origins cannot make
 * changes: they are refused before any route runs.
 */
export function cors(req: Request, res: Response, next: NextFunction): void {
	const origin = req.headers.origin;
	const allowed = !!origin && originAllowed(origin, req);
	res.setHeader('Vary', 'Origin');
	res.setHeader('Access-Control-Allow-Origin', allowed ? origin! : '*');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

/** Production authentication accepts only bearer access tokens, never session cookies. */
export function loadBearerSession(tokens: TokenStore) {
	return function (req: Request, res: Response, next: NextFunction): void {
		const header = req.get('Authorization');
		const match = header && header.length <= 2055 && /^Bearer ([A-Za-z0-9_.-]+)$/i.exec(header);
		const session = match ? tokens.access(match[1]) : null;
		if (session) { res.locals.session = session; res.locals.tokenFamilyId = session.familyId; }
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
		res.setHeader('WWW-Authenticate', 'Bearer');
		res.status(401).json({ error: 'Sign in required' });
	};
}

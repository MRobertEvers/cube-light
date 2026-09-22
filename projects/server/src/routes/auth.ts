import { json, Router } from 'express';
import type { Request, Response } from 'express';

import { clearSessionCookie, setSessionCookie } from '../auth/cookies';
import { KVStore } from '../auth/kv-store';
import { currentSession } from '../auth/middleware';
import {
	hashPassword,
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	UNUSED_PASSWORD_HASH,
	verifyPassword
} from '../auth/passwords';
import { SessionStore } from '../auth/sessions';
import { publicUser, USERNAME, UserStore } from '../auth/UserStore';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT_PER_USERNAME = 10;
const LOGIN_LIMIT_PER_ADDRESS = 50;

function credentials(
	req: Request
): { username: string; password: string } | null {
	const { username, password } = req.body || {};
	if (typeof username !== 'string' || typeof password !== 'string')
		return null;
	if (password.length > MAX_PASSWORD_LENGTH) return null;
	return { username: username.trim(), password };
}

/**
 * Counts an attempt against each key for the window. Past any limit, answers 429 with
 * Retry-After and returns true.
 */
function throttled(
	kv: KVStore,
	res: Response,
	limits: [string, number][]
): boolean {
	for (const [key, limit] of limits) {
		if (kv.incr(key, LOGIN_WINDOW_MS) <= limit) continue;
		res.setHeader('Retry-After', String(Math.ceil(kv.ttl(key) / 1000)));
		res.status(429).json({
			error: 'Too many sign-in attempts. Try again later.'
		});
		return true;
	}
	return false;
}

export function createRoutesAuth(
	users: UserStore,
	sessions: SessionStore,
	kv: KVStore
) {
	const app = Router();
	app.use('/auth', json());

	/** Replaces any current session so a sign-in never reuses an ID issued before it. */
	function startSession(
		req: Request,
		res: Response,
		userId: number,
		username: string
	) {
		if (res.locals.sessionId) sessions.destroy(res.locals.sessionId);
		setSessionCookie(req, res, sessions.create({ userId, username }));
		res.json({ user: publicUser({ UserId: userId, Username: username }) });
	}

	app.get('/auth/session', async (_req: Request, res: Response) => {
		const session = currentSession(res);
		res.json({
			user: session
				? { id: session.userId, username: session.username }
				: null,
			setupRequired: !(await users.hasAccounts())
		});
	});

	app.post('/auth/login', async (req: Request, res: Response) => {
		const given = credentials(req);
		if (!given) {
			res.status(400).json({ error: 'Enter a username and password.' });
			return;
		}
		const usernameKey = `login:user:${given.username.toLowerCase()}`;
		if (
			throttled(kv, res, [
				[`login:ip:${req.ip}`, LOGIN_LIMIT_PER_ADDRESS],
				[usernameKey, LOGIN_LIMIT_PER_USERNAME]
			])
		)
			return;
		const user = await users.findByUsername(given.username);
		const valid = await verifyPassword(
			given.password,
			user ? user.PasswordHash : await UNUSED_PASSWORD_HASH
		);
		if (!user || !valid) {
			res.status(401).json({ error: 'Incorrect username or password.' });
			return;
		}
		kv.del(usernameKey);
		startSession(req, res, user.UserId, user.Username);
	});

	/** Creates the first account on a new server; closed once any account exists. */
	app.post('/auth/setup', async (req: Request, res: Response) => {
		const given = credentials(req);
		if (!given || !USERNAME.test(given.username)) {
			res.status(400).json({
				error: 'Usernames are 3 to 64 letters, digits, or . _ - @'
			});
			return;
		}
		if (given.password.length < MIN_PASSWORD_LENGTH) {
			res.status(400).json({
				error: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`
			});
			return;
		}
		if (await users.hasAccounts()) {
			res.status(403).json({
				error: 'This server already has an account.'
			});
			return;
		}
		const userId = await users.createFirst(
			given.username,
			await hashPassword(given.password)
		);
		if (userId === null) {
			res.status(403).json({
				error: 'This server already has an account.'
			});
			return;
		}
		startSession(req, res, userId, given.username);
	});

	app.post('/auth/logout', (req: Request, res: Response) => {
		if (res.locals.sessionId) sessions.destroy(res.locals.sessionId);
		clearSessionCookie(req, res);
		res.sendStatus(204);
	});

	return app;
}

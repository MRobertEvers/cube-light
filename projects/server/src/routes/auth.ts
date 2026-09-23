import { json, Router } from 'express';
import type { Request, Response } from 'express';

import { KVStore } from '../auth/kv-store';
import { currentSession } from '../auth/middleware';
import {
	hashPassword,
	MAX_PASSWORD_LENGTH,
	MIN_PASSWORD_LENGTH,
	UNUSED_PASSWORD_HASH,
	verifyPassword
} from '../auth/passwords';
import { SyncRepository } from '../sync/repository';
import { TokenStore } from '../auth/tokens';
import {
	ProfileCrop,
	publicUser,
	USERNAME,
	UserProfile,
	UserStore
} from '../auth/UserStore';

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
	tokens: TokenStore,
	kv: KVStore,
	sync?: SyncRepository
) {
	const app = Router();
	app.use('/auth', json());
	app.use('/auth', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
	function exposedUser(user: Parameters<typeof publicUser>[0]) {
		const result = publicUser(user);
		const profile = sync?.readState(`profile_${result.id}`);
		if (profile?.kind === 'profile') result.profile = profile.profile;
		return result;
	}

	/** Replaces any current session so a sign-in never reuses an ID issued before it. */
	async function startSession(
		req: Request,
		res: Response,
		userId: number,
		username: string
	) {
		if (res.locals.tokenFamilyId) tokens.revoke(res.locals.tokenFamilyId);
		const issued = tokens.issue(userId, username);
		const user = await users.findById(userId);
		res.json({ user: user ? exposedUser(user) : null, serverInstanceId: sync ? sync.serverInstanceId : undefined, tokens: issued ? issued : undefined });
	}

	app.post('/auth/refresh', async (req, res) => {
		const pair = tokens?.rotate(req.body?.refreshToken, req.body?.requestId);
		if (!pair) { res.status(401).json({ error: 'Refresh expired or revoked. Sign in again.' }); return; }
		const session = tokens!.identity(pair.familyId);
		const user = session ? await users.findById(session.userId) : null;
		if (!user) { tokens!.revoke(pair.familyId); res.status(401).json({ error: 'Account no longer available.' }); return; }
		res.json({ user: exposedUser(user), setupRequired: false, serverInstanceId: sync?.serverInstanceId, tokens: pair });
	});
	app.post('/auth/revoke-all', (_req, res) => {
		const principal = currentSession(res);
		if (!tokens || !principal) { res.status(401).json({ error: 'Sign in required' }); return; }
		res.json({ generation: tokens.revokePrincipal(principal.userId) });
	});

	app.get('/auth/session', async (_req: Request, res: Response) => {
		const session = currentSession(res);
		const user = session ? await users.findById(session.userId) : undefined;
		res.json({
			user: user ? exposedUser(user) : null,
			serverInstanceId: sync ? sync.serverInstanceId : undefined,
			setupRequired: !(await users.hasAccounts())
		});
	});

	app.put('/auth/profile', async (req: Request, res: Response) => {
		const session = currentSession(res);
		if (!session) {
			res.status(401).json({ error: 'Sign in required' });
			return;
		}
		const { cardName, cardUuid, art, crop } = req.body || {};
		if (
			typeof cardName !== 'string' ||
			!cardName.trim() ||
			cardName.length > 256 ||
			typeof cardUuid !== 'string' ||
			!cardUuid.trim() ||
			cardUuid.length > 128 ||
			typeof art !== 'string' ||
			art.length > 4096 ||
			!validArtUrl(art) ||
			!validCrop(crop)
		) {
			res.status(400).json({ error: 'Invalid profile artwork.' });
			return;
		}
		const profile: UserProfile = {
			cardName: cardName.trim(),
			cardUuid,
			art,
			crop
		};
		const user = await users.setProfile(session.userId, profile);
		if (!user) {
			res.status(404).json({ error: 'Account not found.' });
			return;
		}
		res.json({ user: publicUser(user) });
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
		await startSession(req, res, user.UserId, user.Username);
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
		await startSession(req, res, userId, given.username);
	});

	app.post('/auth/logout', (req: Request, res: Response) => {
		if (res.locals.tokenFamilyId) tokens?.revoke(res.locals.tokenFamilyId);
		if (typeof req.body?.refreshToken === 'string') tokens?.revokeRefresh(req.body.refreshToken);
		res.sendStatus(204);
	});

	return app;
}

function validArtUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		return false;
	}
}

function validCrop(value: unknown): value is ProfileCrop {
	if (!value || typeof value !== 'object') return false;
	const crop = value as Partial<ProfileCrop>;
	return (
		typeof crop.x === 'number' &&
		Number.isFinite(crop.x) &&
		crop.x >= 0 &&
		crop.x <= 1 &&
		typeof crop.y === 'number' &&
		Number.isFinite(crop.y) &&
		crop.y >= 0 &&
		crop.y <= 1 &&
		typeof crop.zoom === 'number' &&
		Number.isFinite(crop.zoom) &&
		crop.zoom >= 1 &&
		crop.zoom <= 3
	);
}

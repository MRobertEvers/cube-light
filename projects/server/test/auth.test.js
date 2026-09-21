const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const { createKVStore } = require('../build/src/auth/kv-store');
const { SessionStore } = require('../build/src/auth/sessions');
const { UserStore } = require('../build/src/auth/UserStore');
const { cors, loadSession, requireSession } = require('../build/src/auth/middleware');
const { createRoutesAuth } = require('../build/src/routes/auth');

async function startServer() {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-light-auth-'));
	const users = await UserStore.Sqlite(path.join(directory, 'app.sqlite'));
	const kv = createKVStore();
	const sessions = new SessionStore(kv);
	const app = express();
	app.use(cors);
	app.use(loadSession(sessions));
	app.use(createRoutesAuth(users, sessions, kv));
	app.use(requireSession(['/auth', '/public']));
	app.get('/public/ping', (_req, res) => res.json({ ok: true }));
	app.get('/private', (_req, res) => res.json({ user: res.locals.session.username }));
	app.post('/private', (_req, res) => res.json({ changed: true }));
	const server = await new Promise((resolve) => {
		const s = app.listen(0, '127.0.0.1', () => resolve(s));
	});
	const base = `http://127.0.0.1:${server.address().port}`;
	return {
		base,
		users,
		async close() {
			await new Promise((resolve) => server.close(resolve));
			await users.close();
			fs.rmSync(directory, { recursive: true, force: true });
		}
	};
}

function post(url, body, headers = {}) {
	return fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

function sessionCookie(response) {
	const header = response.headers.get('set-cookie');
	assert.ok(header, 'expected Set-Cookie');
	assert.match(header, /HttpOnly/);
	assert.match(header, /SameSite=Lax/);
	return header.split(';')[0];
}

test('first-run setup, sign in, protected routes, and sign out', async () => {
	const server = await startServer();
	try {
		const { base } = server;
		assert.deepEqual(await (await fetch(`${base}/auth/session`)).json(), {
			user: null,
			setupRequired: true
		});
		assert.equal((await fetch(`${base}/private`)).status, 401);
		assert.equal((await fetch(`${base}/public/ping`)).status, 200);

		assert.equal((await post(`${base}/auth/setup`, { username: 'ab', password: 'long enough' })).status, 400);
		assert.equal((await post(`${base}/auth/setup`, { username: 'owner', password: 'short' })).status, 400);
		const setup = await post(`${base}/auth/setup`, { username: 'Owner', password: 'correct horse' });
		assert.equal(setup.status, 200);
		assert.deepEqual((await setup.json()).user.username, 'Owner');
		const setupCookie = sessionCookie(setup);
		assert.equal((await post(`${base}/auth/setup`, { username: 'second', password: 'correct horse' })).status, 403);

		const wrong = await post(`${base}/auth/login`, { username: 'owner', password: 'nope nope' });
		assert.equal(wrong.status, 401);
		const missing = await post(`${base}/auth/login`, { username: 'nobody', password: 'nope nope' });
		assert.equal(missing.status, 401);

		// Case-insensitive username; a new ID replaces the one presented.
		const login = await post(
			`${base}/auth/login`,
			{ username: 'OWNER', password: 'correct horse' },
			{ Cookie: setupCookie }
		);
		assert.equal(login.status, 200);
		const cookie = sessionCookie(login);
		assert.notEqual(cookie, setupCookie);
		assert.equal((await fetch(`${base}/private`, { headers: { Cookie: setupCookie } })).status, 401);

		const session = await (await fetch(`${base}/auth/session`, { headers: { Cookie: cookie } })).json();
		assert.equal(session.user.username, 'Owner');
		assert.equal(session.setupRequired, false);
		const privateRead = await fetch(`${base}/private`, { headers: { Cookie: cookie } });
		assert.deepEqual(await privateRead.json(), { user: 'Owner' });

		const logout = await post(`${base}/auth/logout`, {}, { Cookie: cookie });
		assert.equal(logout.status, 204);
		assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
		assert.equal((await fetch(`${base}/private`, { headers: { Cookie: cookie } })).status, 401);
	} finally {
		await server.close();
	}
});

test('credentialed CORS only for the same host, and foreign origins cannot write', async () => {
	const server = await startServer();
	try {
		const { base } = server;
		const port = new URL(base).port;
		const ownClient = await fetch(`${base}/public/ping`, { headers: { Origin: 'http://127.0.0.1:3000' } });
		assert.equal(ownClient.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');
		assert.equal(ownClient.headers.get('access-control-allow-credentials'), 'true');

		const foreign = await fetch(`${base}/public/ping`, { headers: { Origin: 'http://evil.example' } });
		assert.equal(foreign.headers.get('access-control-allow-origin'), '*');
		assert.equal(foreign.headers.get('access-control-allow-credentials'), null);

		const foreignWrite = await post(`${base}/auth/login`, { username: 'a', password: 'b' }, { Origin: 'http://evil.example' });
		assert.equal(foreignWrite.status, 403);

		const preflight = await fetch(`${base}/private`, {
			method: 'OPTIONS',
			headers: { Origin: `http://127.0.0.1:${port}`, 'Access-Control-Request-Method': 'POST' }
		});
		assert.equal(preflight.status, 204);
	} finally {
		await server.close();
	}
});

test('sign-in attempts per username are rate limited', async () => {
	const server = await startServer();
	try {
		const { base, users } = server;
		await users.createFirst('victim', 'scrypt$2$1$1$AA==$AA==');
		const statuses = [];
		for (let i = 0; i < 11; i++)
			statuses.push((await post(`${base}/auth/login`, { username: 'victim', password: `guess ${i}` })).status);
		assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
		const limited = await post(`${base}/auth/login`, { username: 'Victim', password: 'guess' });
		assert.equal(limited.status, 429);
		assert.ok(Number(limited.headers.get('retry-after')) > 0);
	} finally {
		await server.close();
	}
});

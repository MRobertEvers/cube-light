const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { Database } = require('../build/src/database/app/database');

/** @param {(filename: string) => Promise<void>} run */
async function fixture(run) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torimtg-tokens-'));
	try {
		await run(path.join(directory, 'app.sqlite'));
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

test('database opening migrates legacy token storage and preserves signing keys', async () => {
	await fixture(async (filename) => {
		const legacy = new DatabaseSync(filename);
		try {
			legacy.exec(`
				CREATE TABLE Users (UserId INTEGER PRIMARY KEY, Name TEXT, CreatedAt TEXT, UpdatedAt TEXT);
				INSERT INTO Users VALUES (1, 'owner', '2026-01-01', '2026-01-01');
				CREATE TABLE AuthSigningKeys (Id INTEGER PRIMARY KEY CHECK(Id=1), Secret TEXT NOT NULL);
				INSERT INTO AuthSigningKeys VALUES (1, 'existing-signing-key');
				CREATE TABLE AuthTokenFamilies (Id TEXT PRIMARY KEY, UserId INTEGER NOT NULL, Username TEXT NOT NULL, ExpiresAt INTEGER NOT NULL, Revoked INTEGER NOT NULL DEFAULT 0, CurrentHash TEXT NOT NULL);
				INSERT INTO AuthTokenFamilies VALUES ('legacy-family', 1, 'owner', 9999999999999, 0, 'old-hash');
			`);
		} finally {
			legacy.close();
		}
		const database = await Database.Sqlite(filename);
		let pair;
		try {
			assert.deepEqual(database.tokens.identity('legacy-family'), { userId: 1, username: 'owner' });
			assert.equal(database.getOrCreateTokenSigningKey('replacement'), 'existing-signing-key');
			pair = database.tokens.issue(1, 'owner');
			assert.equal(pair.generation, 0);
		} finally {
			await database.close();
		}
		const reopened = await Database.Sqlite(filename);
		try {
			assert.equal(reopened.tokens.access(pair.accessToken).userId, 1);
			assert.equal(reopened.tokens.revokePrincipal(1), 1);
			assert.equal(reopened.tokens.identity('legacy-family'), null);
		} finally {
			await reopened.close();
		}
	});
});

test('a failed refresh-token write rolls back the entire token issuance', async () => {
	await fixture(async (filename) => {
		const database = await Database.Sqlite(filename);
		const inspection = new DatabaseSync(filename);
		try {
			inspection.exec(`
				INSERT INTO Users(UserId, Name, CreatedAt, UpdatedAt) VALUES (1, 'owner', '2026-01-01', '2026-01-01');
				CREATE TRIGGER FailRefreshInsert BEFORE INSERT ON AuthRefreshTokens
				BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;
			`);
			assert.throws(() => database.tokens.issue(1, 'owner'), /simulated write failure/);
			for (const table of ['AuthTokenFamilies', 'AuthAccessTokens', 'AuthRefreshTokens']) {
				assert.equal(inspection.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
			}
			inspection.exec('DROP TRIGGER FailRefreshInsert');
			const pair = database.tokens.issue(1, 'owner');
			assert.equal(database.tokens.access(pair.accessToken).userId, 1);
		} finally {
			inspection.close();
			await database.close();
		}
	});
});

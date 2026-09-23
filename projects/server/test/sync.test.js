const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { Database } = require('../build/src/database/app/database');
const { ACCESS_TOKEN_MS, REFRESH_TOKEN_MS } = require('../build/src/auth/tokens');

/** @param {(database: import('../build/src/database/app/database').Database, filename: string) => Promise<void>} run */
async function fixture(run) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'torimtg-sync-'));
    const filename = path.join(directory, 'app.sqlite');
    const database = await Database.Sqlite(filename);
    try { await database.sync.initialize();
        await database.sync.database.run("INSERT INTO Users(UserId, Name, CreatedAt, UpdatedAt) VALUES (1, 'owner', '2026-01-01', '2026-01-01')");
        await run(database, filename); }
    finally { await database.close(); fs.rmSync(directory, { recursive: true, force: true }); }
}

/** @param {any} repository @param {any} command @param {number} revision */
function envelope(repository, command, revision) {
    return { protocolVersion: 1, serverInstanceId: repository.serverInstanceId, accountId: 1, datasetId: 'shared', operationId: randomUUID(), clientId: 'test-client', expectedRevision: revision, command };
}

test('idempotency settles a lost response without duplicating events or quantities', async () => {
    await fixture(async (db) => {
        const id = 'deck_abcdefghijklmnop';
        db.sync.commit(envelope(db.sync, { type: 'deck.create', id, name: 'Offline' }, 0), 1);
        const request = envelope(db.sync, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', action: 'add', count: 2 }] }, 1);
        const first = db.sync.commit(request, 1);
        assert.equal(first.status, 'accepted');
        assert.deepEqual(db.sync.commit(request, 1), first);
        assert.equal(db.sync.readState(id).cards['card-a'], 2);
        assert.equal(db.sync.history(id).length, 2);
        assert.throws(() => db.sync.commit({ ...request, command: { ...request.command, edits: [] } }, 1), /reused/);
        const stale = db.sync.commit(envelope(db.sync, { type: 'deck.details', id, name: 'Other device' }, 1), 1);
        assert.equal(stale.status, 'conflict');
        assert.equal(db.sync.readState(id).name, 'Offline');
    });
});

test('checkpoints balance every 100 events and paginated feed retains command receipts', async () => {
    await fixture(async (db) => {
        const id = 'deck_abcdefghijklmnop';
        db.sync.commit(envelope(db.sync, { type: 'deck.create', id, name: 'Start' }, 0), 1);
        for (let revision = 1; revision <= 100; revision++) {
            const outcome = db.sync.commit(envelope(db.sync, { type: 'deck.details', id, name: `Version ${revision}` }, revision), 1);
            assert.equal(outcome.status, 'accepted');
            if (revision === 100) assert.equal(outcome.replicas[0].checkpoint.throughSequence, 101);
        }
        const history = db.sync.history(id);
        assert.equal(history.length, 101);
        const page = db.sync.readPage(1, 0, []);
        assert.equal(page.hasMore, true);
        assert.equal(page.replicas[0].sequence, 32);
        assert.equal(page.replicas[0].state.name, 'Version 31');
    });
});

test('invalid batch is rejected atomically and foreign account envelopes are refused', async () => {
    await fixture(async (db) => {
        const id = 'deck_abcdefghijklmnop';
        db.sync.commit(envelope(db.sync, { type: 'deck.create', id, name: 'Test' }, 0), 1);
        const request = envelope(db.sync, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', action: 'add', count: 2 }, { uuid: 'card-b', action: 'set', count: -1 }] }, 1);
        assert.equal(db.sync.commit(request, 1).status, 'rejected');
        assert.deepEqual(db.sync.readState(id).cards, {});
        assert.equal(db.sync.history(id).length, 1);
        assert.throws(() => db.sync.commit(request, 2), /account/);
    });
});

test('side-board edits and moves commit, replay, and keep the main board apart', async () => {
    await fixture(async (db) => {
        const id = 'deck_abcdefghijklmnop';
        db.sync.commit(envelope(db.sync, { type: 'deck.create', id, name: 'Boards' }, 0), 1);
        db.sync.commit(envelope(db.sync, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', action: 'add', count: 4 }, { uuid: 'card-b', action: 'add', count: 2, board: 'side' }] }, 1), 1);
        const move = db.sync.commit(envelope(db.sync, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', action: 'remove', count: 1 }, { uuid: 'card-a', action: 'add', count: 1, board: 'side' }] }, 2), 1);
        assert.equal(move.status, 'accepted');
        const state = db.sync.readState(id);
        assert.deepEqual(state.cards, { 'card-a': 3 });
        assert.deepEqual(state.sideboard, { 'card-a': 1, 'card-b': 2 });
        assert.deepEqual(db.sync.readPage(1, 0, []).replicas[0].state, state);
        const unknown = db.sync.commit(envelope(db.sync, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', action: 'add', count: 1, board: 'maybe' }] }, 3), 1);
        assert.equal(unknown.status, 'rejected');
    });
});

test('persistent bearer tokens rotate, survive restart, and detect refresh reuse', async () => {
    await fixture(async (db, filename) => {
        const now = Date.now();
        const initial = db.tokens.issue(1, 'owner', now);
        assert.equal(db.tokens.access(initial.accessToken, now).userId, 1);
        assert.equal(db.tokens.access(initial.accessToken, now + ACCESS_TOKEN_MS), null);
        const attempt = randomUUID();
        const rotated = db.tokens.rotate(initial.refreshToken, attempt, now + ACCESS_TOKEN_MS);
        assert.ok(rotated);
        assert.notEqual(rotated.refreshToken, initial.refreshToken);
        assert.equal(rotated.refreshExpiresAt, now + REFRESH_TOKEN_MS);
        assert.deepEqual(db.tokens.rotate(initial.refreshToken, attempt, now + ACCESS_TOKEN_MS + 1000), rotated, 'lost refresh response is replayable with its durable attempt ID');
        const reopened = await Database.Sqlite(filename);
        try {
            assert.equal(reopened.tokens.access(rotated.accessToken, now + ACCESS_TOKEN_MS + 1000).userId, 1);
            assert.equal(reopened.tokens.rotate(initial.refreshToken, randomUUID(), now + ACCESS_TOKEN_MS + 1000), null);
            assert.equal(reopened.tokens.access(rotated.accessToken, now + ACCESS_TOKEN_MS + 1000), null, 'reuse revokes the family');
        } finally { await reopened.close(); }
    });
});

test('logout revokes access and refresh credentials together', async () => {
    await fixture(async (db) => {
        const pair = db.tokens.issue(1, 'owner');
        db.tokens.revokeRefresh(pair.refreshToken);
        assert.equal(db.tokens.access(pair.accessToken), null);
        assert.equal(db.tokens.rotate(pair.refreshToken, randomUUID()), null);
    });
});

test('principal token generation revokes all devices without rewriting individual tokens', async () => {
    await fixture(async (db) => {
        const first = db.tokens.issue(1, 'owner');
        const second = db.tokens.issue(1, 'owner');
        const claims = JSON.parse(Buffer.from(first.accessToken.split('.')[1], 'base64url').toString());
        assert.equal(claims.generation, 0);
        assert.equal(JSON.parse(Buffer.from(first.refreshToken.split('.')[1], 'base64url')).generation, 0);
        assert.equal(db.tokens.revokePrincipal(1), 1);
        assert.equal(db.tokens.access(first.accessToken), null);
        assert.equal(db.tokens.access(second.accessToken), null);
        assert.equal(db.tokens.rotate(first.refreshToken, randomUUID()), null);
        const replacement = db.tokens.issue(1, 'owner');
        assert.equal(replacement.generation, 1);
        assert.equal(db.tokens.access(replacement.accessToken).userId, 1);
        const [header, payload, signature] = replacement.accessToken.split('.');
        const forged = {...JSON.parse(Buffer.from(payload, 'base64url')), generation: 2};
        assert.equal(db.tokens.access(`${header}.${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${signature}`), null);
    });
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const { Database } = require('../build/src/database/app/database');
const { mergeInto } = require('../build/src/sync/shared-merge');
const { SharedDatabase } = require('../build/src/sync/shared-database');
const { UserStore } = require('../build/src/auth/UserStore');

const DECK = 'deck_abcdefghijklmnop';

/**
 * @typedef {Object} Servers
 * @property {string} directory
 * @property {(name: string) => Promise<any>} open  a Database in the scratch folder (closed after)
 * @property {(from: any, name: string) => Promise<any>} copy  another server starting from a copy of `from`
 */

/** @param {(servers: Servers) => Promise<void>} body */
async function withServers(body) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cube-shared-'));
    const opened = [];
    /** @param {string} name */
    async function open(name) {
        const database = await Database.Sqlite(path.join(directory, name));
        await (await UserStore.Sqlite(path.join(directory, name))).close();
        await database.sync.initialize();
        opened.push(database);
        return database;
    }
    try {
        await body({
            directory,
            open,
            async copy(from, name) {
                await from.sync.database.exec(`VACUUM INTO '${path.join(directory, name)}'`);
                return open(name);
            }
        });
    } finally {
        for (const database of opened) await database.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
}

/** @param {any} db @param {any} command */
function commit(db, command) {
    const state = db.sync.readState(command.id);
    const revision = state ? db.sync.history(command.id).length : 0;
    const outcome = db.sync.commit({ protocolVersion: 1, serverInstanceId: db.sync.serverInstanceId, accountId: 1, datasetId: 'shared', operationId: randomUUID(), clientId: 'test', expectedRevision: revision, command }, 1);
    assert.equal(outcome.status, 'accepted', outcome.message);
    return outcome;
}

/** Merges `source` into `target` as SharedDatabase does. */
function merge(target, source) {
    return target.sync.database.transaction((into) => source.sync.database.transaction((from) => mergeInto(into, from)));
}

/** The aggregate's chain as the change feed would give it, checked link by link by readPage. */
function replica(db, id) {
    const page = db.sync.readPage(1, 0, [], { after: '', watermark: Number.MAX_SAFE_INTEGER });
    return page.replicas.find((entry) => entry.id === id);
}

async function addOwner(db) {
    await db.sync.database.run("INSERT INTO Users(UserId, Name, Username, PasswordHash, CreatedAt, UpdatedAt) VALUES (1, 'owner', 'owner', 'hash-1', '2026-01-01', '2026-01-01')");
}

test('a chain that extends the other is copied as it is', () => withServers(async (servers) => {
    const here = await servers.open('here.sqlite');
    await addOwner(here);
    commit(here, { type: 'deck.create', id: DECK, name: 'Base' });
    const there = await servers.copy(here, 'there.sqlite');
    commit(there, { type: 'deck.cards', id: DECK, edits: [{ uuid: 'card-a', action: 'add', count: 3 }] });

    const result = merge(here, there);
    assert.equal(result.aggregates, 1);
    assert.equal(result.events, 1);
    assert.equal(result.rebased, 0);
    assert.deepEqual(here.sync.readState(DECK), there.sync.readState(DECK));
    assert.deepEqual(here.sync.history(DECK).map((event) => event.eventHash), there.sync.history(DECK).map((event) => event.eventHash));
    assert.equal(replica(here, DECK).sequence, 2);
    // Nothing more to bring either way.
    assert.equal(merge(here, there).aggregates, 0);
    assert.equal(merge(there, here).aggregates, 0);
}));

test('forked chains keep the source\'s and replay the target\'s own edits on top, quantities by their deltas', () => withServers(async (servers) => {
    const here = await servers.open('here.sqlite');
    await addOwner(here);
    commit(here, { type: 'deck.create', id: DECK, name: 'Base' });
    commit(here, { type: 'deck.cards', id: DECK, edits: [{ uuid: 'card-a', action: 'add', count: 2 }] });
    const there = await servers.copy(here, 'there.sqlite');

    commit(there, { type: 'deck.cards', id: DECK, edits: [{ uuid: 'card-a', action: 'add', count: 1 }] });
    commit(here, { type: 'deck.cards', id: DECK, edits: [{ uuid: 'card-a', action: 'add', count: 2 }, { uuid: 'card-b', action: 'add', count: 1 }] });
    commit(here, { type: 'deck.details', id: DECK, name: 'Renamed here' });
    const before = here.sync.history(DECK).length;

    // Here takes the shared copy's changes: its own two are rebased onto them.
    const pulled = merge(here, there);
    assert.equal(pulled.rebased, 2);
    assert.deepEqual(pulled.conflicts, []);
    const state = here.sync.readState(DECK);
    assert.equal(state.cards['card-a'], 5);
    assert.equal(state.cards['card-b'], 1);
    assert.equal(state.name, 'Renamed here');
    const chain = replica(here, DECK);
    // Longer than what this server's devices hold, so they take it.
    assert.ok(chain.sequence > before);
    assert.equal(chain.state.cards['card-a'], 5);

    // Then gives them back: both now hold the same chain.
    const pushed = merge(there, here);
    assert.equal(pushed.rebased, 0);
    assert.deepEqual(there.sync.readState(DECK), here.sync.readState(DECK));
    assert.deepEqual(there.sync.history(DECK).map((event) => event.eventHash), here.sync.history(DECK).map((event) => event.eventHash));
}));

test('an edit that no longer applies after the other server deleted the aggregate is a conflict', () => withServers(async (servers) => {
    const here = await servers.open('here.sqlite');
    await addOwner(here);
    commit(here, { type: 'deck.create', id: DECK, name: 'Base' });
    const there = await servers.copy(here, 'there.sqlite');
    commit(there, { type: 'deck.delete', id: DECK });
    commit(here, { type: 'deck.details', id: DECK, name: 'Edited' });
    commit(here, { type: 'deck.details', id: DECK, name: 'Edited again' });

    const result = merge(here, there);
    // Two events dropped for one gained: devices here may hold a longer chain, which is said too.
    assert.deepEqual(result.conflicts.map((conflict) => conflict.kind), ['dropped-event', 'dropped-event', 'shortened']);
    assert.equal(here.sync.readState(DECK).deleted, true);
    assert.equal(merge(here, there).aggregates, 0);
}));

test('accounts are merged by id and name; the token generation only rises', () => withServers(async (servers) => {
    const here = await servers.open('here.sqlite');
    await addOwner(here);
    const there = await servers.copy(here, 'there.sqlite');
    await there.sync.database.run("INSERT INTO Users(UserId, Name, Username, PasswordHash, CreatedAt, UpdatedAt) VALUES (2, 'friend', 'friend', 'hash-2', '2026-02-01', '2026-02-01')");
    await there.sync.database.run("UPDATE Users SET PasswordHash='hash-1b', UpdatedAt='2026-03-01', token_generation=2 WHERE UserId=1");
    await here.sync.database.run("INSERT INTO Users(UserId, Name, Username, PasswordHash, CreatedAt, UpdatedAt) VALUES (3, 'Friend', 'Friend', 'hash-3', '2026-02-01', '2026-02-01')");

    const result = merge(here, there);
    assert.equal(result.users, 1);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.conflicts[0].kind, 'account');
    const owner = await here.sync.database.get('SELECT PasswordHash, token_generation FROM Users WHERE UserId=1');
    assert.equal(owner.PasswordHash, 'hash-1b');
    assert.equal(owner.token_generation, 2);
    assert.equal(await here.sync.database.get('SELECT 1 FROM Users WHERE UserId=2'), undefined);
}));

test('servers share the NAS copy: the first makes it, a new one starts from it, and each takes the other\'s changes', () => withServers(async (servers) => {
    const nas = path.join(servers.directory, 'nas', 'cube-light', 'database');
    fs.mkdirSync(nas, { recursive: true });
    const sharedFile = path.join(nas, 'cube-light-application-database.sqlite');

    const firstPath = path.join(servers.directory, 'first.sqlite');
    const first = await servers.open('first.sqlite');
    await addOwner(first);
    const firstKey = first.getOrCreateTokenSigningKey('unused');
    commit(first, { type: 'deck.create', id: DECK, name: 'From the first' });
    const firstShared = await SharedDatabase.open({ local: firstPath, shared: sharedFile, intervalMs: 3600_000 });
    await firstShared.sync('boot');
    assert.ok(fs.existsSync(sharedFile));
    assert.ok(fs.existsSync(path.join(nas, 'cube-light-application-database.json')));
    assert.ok(fs.readFileSync(path.join(nas, 'README.txt'), 'utf8').includes('cube-light'));

    // A second server with no database starts from the shared copy, less the first's own.
    const secondPath = path.join(servers.directory, 'second.sqlite');
    assert.equal(await SharedDatabase.seed(secondPath, sharedFile), true);
    assert.equal(await SharedDatabase.seed(secondPath, sharedFile), false);
    const second = await servers.open('second.sqlite');
    assert.notEqual(second.sync.serverInstanceId, first.sync.serverInstanceId);
    // Its own signing key, made when it opened, not the first's.
    assert.notEqual((await second.sync.database.get('SELECT Secret FROM AuthSigningKeys')).Secret, firstKey);
    assert.equal(second.sync.readState(DECK).name, 'From the first');
    const secondShared = await SharedDatabase.open({ local: secondPath, shared: sharedFile, intervalMs: 3600_000 });
    await secondShared.sync('boot');

    commit(second, { type: 'deck.details', id: DECK, name: 'From the second' });
    await secondShared.sync('changes');
    await firstShared.sync('interval');
    assert.equal(first.sync.readState(DECK).name, 'From the second');

    // A merge in progress elsewhere (a fresh lock) is waited out, not broken.
    commit(first, { type: 'deck.details', id: DECK, name: 'Locked out' });
    fs.writeFileSync(`${sharedFile}.lock`, 'elsewhere');
    await firstShared.sync('changes');
    await secondShared.sync('interval');
    assert.equal(second.sync.readState(DECK).name, 'From the second');
    fs.rmSync(`${sharedFile}.lock`);
    await firstShared.stop();
    await secondShared.sync('interval');
    assert.equal(second.sync.readState(DECK).name, 'Locked out');
    await secondShared.stop();
    assert.deepEqual(fs.readdirSync(nas).filter((name) => name.endsWith('.part') || name.endsWith('.lock')), []);
    assert.deepEqual(fs.readdirSync(servers.directory).filter((name) => name.includes('.shared-')), []);
}));

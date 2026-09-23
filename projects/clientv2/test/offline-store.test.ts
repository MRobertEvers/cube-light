import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { IndexedDbDriver, TABLES } from '../src/torimtg/adapters/indexeddb-driver';
import { IndexedDbLocalStore, hash } from '../src/torimtg/adapters/local-store';
import { applyEvent } from '@torimtg/core';
import type { EventEnvelope, Replica, DomainEvent } from '@torimtg/core';

async function fixture() {
    const driver = new IndexedDbDriver(`test-${crypto.randomUUID()}`, indexedDB);
    const store = new IndexedDbLocalStore(driver);
    await store.open();
    const job = await store.startAuth('login');
    await store.finishAuth(job, { user: { id: 1, username: 'owner', profile: null }, serverInstanceId: 'test-server', setupRequired: false });
    const scope = (await store.scope())!;
    return { driver, store, scope };
}

async function replica(id: string, operationId: string, event: DomainEvent, previous?: Replica): Promise<Replica> {
    const sequence = (previous?.sequence || 0) + 1;
    const unsigned = { eventId: crypto.randomUUID(), aggregateId: id, aggregateSequence: sequence, commitPosition: sequence, operationId, actorId: 1, recordedAt: new Date().toISOString(), eventSchemaVersion: 1 as const, previousEventHash: previous?.hash || '', event };
    const envelope: EventEnvelope = { ...unsigned, eventHash: await hash(unsigned) };
    const state = applyEvent(previous?.state || null, event, id, envelope.recordedAt);
    const checkpoint = previous?.checkpoint || { aggregateId: id, throughSequence: sequence, throughEventId: envelope.eventId, schemaVersion: 1 as const, reducerVersion: 1 as const, stateHash: await hash(state), ledgerHash: envelope.eventHash, createdAt: envelope.recordedAt, state };
    return { id, sequence, hash: envelope.eventHash, state, checkpoint, events: previous ? [...previous.events, envelope] : [] };
}

test('local intent, projection and outbox commit atomically and reconstruct after reopening', async () => {
    const { driver, store, scope } = await fixture();
    const id = 'deck_abcdefghijklmnop';
    const commit = await store.commit(scope, { type: 'deck.create', id, name: 'Offline' });
    await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 2, action: 'add' }] });
    store.close(); await store.open();
    const data = await store.dataset(scope);
    assert.equal(data.intents.length, 2);
    assert.equal(data.intents[1].dependsOn, commit.operationId);
    assert.equal((data.states[0] as any).cards['card-a'], 2);
    await driver.transaction(['views', 'outbox'], 'readwrite', async (tables) => {
        await tables.remove('views', [scope.partition, id]);
        for (const intent of data.intents) await tables.remove('outbox', [scope.partition, intent.operationId]);
    });
    await store.rebuild(scope);
    assert.equal(((await store.dataset(scope)).states[0] as any).cards['card-a'], 2);
    await assert.rejects(store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: -1, action: 'add' }] }));
    assert.equal((await store.dataset(scope)).intents.length, 2);
    store.close();
});

test('acknowledgement replaces the pending proposal atomically and preserves later edits', async () => {
    const { store, scope } = await fixture();
    const id = 'deck_abcdefghijklmnop';
    const create = await store.commit(scope, { type: 'deck.create', id, name: 'Local' });
    const lease = (await store.acquire(scope, 'worker-one'))!;
    const prepared = (await store.prepare(lease))!;
    assert.equal(prepared.prepared!.expectedRevision, 0);
    const initial = await replica(id, create.operationId, { type: 'DeckCreated', name: 'Local' });
    await store.settle(lease, { operationId: create.operationId, status: 'accepted', replicas: [initial], events: [], revisions: { [id]: 1 } });
    const add = await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 1, action: 'add' }] });
    await store.prepare(lease);
    await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 1, action: 'add' }] });
    const updated = await replica(id, add.operationId, { type: 'CardQuantitiesAdjusted', changes: [{ uuid: 'card-a', previous: 0, delta: 1, resulting: 1 }] }, initial);
    const outcome = { operationId: add.operationId, status: 'accepted' as const, replicas: [updated], events: updated.events, revisions: { [id]: 2 } };
    await store.settle(lease, outcome);
    await store.settle(lease, outcome);
    assert.equal(((await store.dataset(scope)).states[0] as any).cards['card-a'], 2);
    assert.equal((await store.prepare(lease))!.prepared!.expectedRevision, 2);
    const tampered = structuredClone(updated); (tampered.state as any).cards['card-a'] = 10;
    await assert.rejects(store.settle(lease, { ...outcome, replicas: [tampered] }), /balance/);
    assert.equal(((await store.dataset(scope)).states[0] as any).cards['card-a'], 2);
    store.close();
});

test('failed IDB transaction does not publish a view without its journal/outbox', async () => {
    const { driver, store, scope } = await fixture();
    await assert.rejects(driver.transaction(TABLES, 'readwrite', async (tables) => {
        await tables.put('views', { partition: scope.partition, id: 'bad', state: { id: 'bad' } });
        throw new Error('Simulated quota/abort');
    }));
    assert.equal((await store.dataset(scope)).states.length, 0);
    store.close();
});

test('account generation invalidates old worker leases and local callbacks', async () => {
    const { store, scope } = await fixture();
    const lease = (await store.acquire(scope, 'old-worker'))!;
    await store.startAuth('logout');
    assert.equal(await store.scope(), null);
    await assert.rejects(store.dataset(scope), /account changed/);
    await assert.rejects(store.prepare(lease), /account changed/);
    store.close();
});

test('confirmed projections rebuild from checkpoint and event ledger after derived state is removed', async () => {
    const { driver, store, scope } = await fixture();
    const id = 'deck_abcdefghijklmnop';
    const lease = (await store.acquire(scope, 'worker'))!;
    const opening = await replica(id, crypto.randomUUID(), { type: 'DeckCreated', name: 'Balanced' });
    const changed = await replica(id, crypto.randomUUID(), { type: 'CardQuantitiesAdjusted', changes: [{ uuid: 'card-a', previous: 0, delta: 3, resulting: 3 }] }, opening);
    await store.settle(lease, { operationId: crypto.randomUUID(), status: 'accepted', events: changed.events, replicas: [changed], revisions: { [id]: 2 } });
    await driver.transaction(['base', 'views'], 'readwrite', async (tables) => {
        await tables.remove('base', [scope.partition, id]); await tables.remove('views', [scope.partition, id]);
    });
    await store.rebuild(scope);
    assert.equal(((await store.dataset(scope)).states[0] as any).cards['card-a'], 3);
    store.close();
});

test('refresh attempt identity survives restart and stale rotation cannot undo sign-out', async () => {
    const { driver, store } = await fixture();
    const id = await store.startAuth('login');
    const session = { user: { id: 1, username: 'owner', profile: null }, serverInstanceId: 'test-server', setupRequired: false, tokens: { tokenType: 'Bearer' as const, generation: 0, familyId: 'family', accessToken: 'access', refreshToken: 'refresh', accessExpiresAt: Date.now() + 1000, refreshExpiresAt: Date.now() + 100000 } };
    await store.finishAuth(id, session);
    const attempt = await store.prepareRefresh();
    store.close(); await store.open();
    assert.equal((await store.prepareRefresh()).refreshRequestId, attempt.refreshRequestId);
    const records = await driver.transaction(['journal', 'outbox'], 'readonly', async (tables) => [...await tables.all('journal'), ...await tables.all('outbox')]);
    assert.equal(JSON.stringify(records).includes('accessToken'), false);
    await store.startAuth('logout');
    await store.rotateCredentials(attempt, { ...session, tokens: { ...session.tokens, accessToken: 'new-access', refreshToken: 'new-refresh' } });
    assert.equal(await store.scope(), null);
    assert.equal((await store.credentials())?.tokens.refreshToken, 'refresh');
    store.close();
});

test('card edits join the deck edit still waiting to be sent, and survive a rebuild', async () => {
    const { store, scope } = await fixture();
    const id = 'deck_abcdefghijklmnop';
    const create = await store.commit(scope, { type: 'deck.create', id, name: 'Steps' });
    const lease = (await store.acquire(scope, 'worker-one'))!;
    await store.prepare(lease);
    await store.settle(lease, { operationId: create.operationId, status: 'accepted', replicas: [await replica(id, create.operationId, { type: 'DeckCreated', name: 'Steps' })], events: [], revisions: { [id]: 1 } });
    const first = await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 1, action: 'add' }] });
    const second = await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 3, action: 'set', board: 'side' }, { uuid: 'card-a', count: 1, action: 'add' }] });
    assert.equal(second.operationId, first.operationId);
    const pending = (await store.dataset(scope)).intents.filter((intent) => intent.status === 'queued');
    assert.equal(pending.length, 1);
    assert.equal((pending[0].command as any).edits.length, 3);
    let deck = (await store.dataset(scope)).states[0] as any;
    assert.equal(deck.cards['card-a'], 2);
    assert.equal(deck.sideboard['card-a'], 3);
    // Once the joined edit is being sent, a later step starts a new request behind it.
    assert.equal((await store.prepare(lease))!.operationId, first.operationId);
    const third = await store.commit(scope, { type: 'deck.cards', id, edits: [{ uuid: 'card-a', count: 1, action: 'remove' }] });
    assert.notEqual(third.operationId, first.operationId);
    await store.rebuild(scope);
    const rebuilt = await store.dataset(scope);
    assert.equal((rebuilt.intents.find((intent) => intent.operationId === first.operationId)!.command as any).edits.length, 3);
    deck = rebuilt.states[0] as any;
    assert.equal(deck.cards['card-a'], 1);
    assert.equal(deck.sideboard['card-a'], 3);
    store.close();
});

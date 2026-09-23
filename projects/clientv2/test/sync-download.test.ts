import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import type { ResourceQuery, SyncPage } from '@torimtg/core';
import { IndexedDbDriver } from '../src/platform/indexeddb/indexeddb-driver';
import { WebCrypto } from '../src/platform/crypto';
import { OutboxLocalStore } from '../src/engine/local-store/local-store';
import { SyncCoordinator } from '../src/engine/sync/sync-coordinator';
import { SyncTransportError, type SyncTransport } from '../src/engine/ports';

const webCrypto = new WebCrypto();

async function fixture(resource: (query: ResourceQuery) => Promise<Blob>) {
    const store = new OutboxLocalStore(new IndexedDbDriver(`test-${crypto.randomUUID()}`, indexedDB), webCrypto);
    await store.open();
    const job = await store.startAuth('login');
    await store.finishAuth(job, { user: { id: 1, username: 'owner', profile: null }, serverInstanceId: 'test-server', setupRequired: false });
    const scope = (await store.scope())!;
    const page: SyncPage = { protocolVersion: 1, serverInstanceId: 'test-server', replicas: [], outcomes: [], cursor: 0, hasMore: false, catalog: {} };
    const transport = {
        pull: async function () { return page; },
        resource: async function (query: ResourceQuery) {
            return { key: JSON.stringify(query), body: await resource(query), status: 200, contentType: 'image/png', validatedAt: new Date().toISOString() };
        }
    } as unknown as SyncTransport;
    const coordinator = new SyncCoordinator(store, transport, webCrypto, async function () {});
    return { store, scope, coordinator };
}

test('download waits out a run that holds the sync lease', async () => {
    const { store, scope, coordinator } = await fixture(async () => new Blob(['banner']));
    const other = (await store.acquire(scope, 'another-run'))!;
    setTimeout(() => void store.release(other), 300);
    const saved = await coordinator.download(scope, { type: 'blob', id: 'blob_a' }, 5000);
    assert.equal(await saved?.body.text(), 'banner');
});

test('concurrent downloads each get their resource', async () => {
    const { scope, coordinator } = await fixture(async (query) => new Blob([(query as { id: string }).id]));
    const ids = ['blob_a', 'blob_b', 'blob_c'];
    const saved = await Promise.all(ids.map((id) => coordinator.download(scope, { type: 'blob', id }, 5000)));
    assert.deepEqual(await Promise.all(saved.map((item) => item?.body.text())), ids);
});

test('download gives up as soon as the server cannot supply the resource', async () => {
    const { scope, coordinator } = await fixture(async () => { throw new SyncTransportError('Not found', 404); });
    const started = Date.now();
    assert.equal(await coordinator.download(scope, { type: 'blob', id: 'blob_missing' }, 5000), null);
    assert.ok(Date.now() - started < 2000);
});

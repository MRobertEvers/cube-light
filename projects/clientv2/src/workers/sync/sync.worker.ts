/// <reference lib="webworker" />
import { OutboxLocalStore } from '../../engine/local-store/local-store';
import { SyncCoordinator } from '../../engine/sync/sync-coordinator';
import { IndexedDbDriver } from '../../platform/indexeddb/indexeddb-driver';
import { HttpSyncTransport } from '../../platform/http/http-sync-transport';
import { WebCrypto } from '../../platform/crypto';
import { API_URI } from '../../platform/api-url';
import {
    SYNC_PROTOCOL_VERSION,
    type SyncNotice,
    type SyncWorkerBroadcast,
    type SyncWorkerReply,
    type SyncWorkerRequest
} from './sync.protocol';

declare const __PRECACHE__: string[];
declare const __BUILD_ID__: string;
const worker = self as unknown as ServiceWorkerGlobalScope;
// SyncWorker's composition root: the engine's store and sync coordinator over IndexedDB and HTTP.
const crypto = new WebCrypto();
const store = new OutboxLocalStore(new IndexedDbDriver('torimtg-v1', indexedDB), crypto);
const server = new HttpSyncTransport(API_URI, store);
const coordinator = new SyncCoordinator(store, server, crypto, notify);
const SHELL = `torimtg-shell-${__BUILD_ID__}`;
const MEDIA = 'torimtg-media-v1';

function broadcast(message: SyncWorkerBroadcast, clients: readonly Client[]): void {
    for (const client of clients) client.postMessage(message);
}

async function notify(notice: SyncNotice): Promise<void> {
    broadcast({ protocolVersion: SYNC_PROTOCOL_VERSION, type: 'LOCAL_CHANGED', notice }, await worker.clients.matchAll({ type: 'window', includeUncontrolled: true }));
}

async function run(): Promise<void> {
    const auth = await store.auth();
    if (auth.pendingLogout && auth.job?.type === 'logout') {
        try { await store.finishAuth(auth.job.id, await server.authenticate('logout')); }
        catch { return; }
    }
    const remains = await coordinator.run().catch(() => false);
    if (remains) {
        const registration = worker.registration as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } };
        await registration.sync?.register('torimtg-sync').catch(() => undefined);
        broadcast({ protocolVersion: SYNC_PROTOCOL_VERSION, type: 'SYNC_PENDING' }, await worker.clients.matchAll());
    }
}

worker.addEventListener('install', (event) => {
    event.waitUntil((async function () {
        const cache = await caches.open(SHELL);
        await cache.addAll(__PRECACHE__);
        // First install may take control immediately. Updates wait for old tabs to close.
        if (!worker.registration.active) await worker.skipWaiting();
    })());
});
worker.addEventListener('activate', (event) => {
    event.waitUntil((async function () {
        await worker.clients.claim();
        // Keep the previous shell so open clients can still load old route chunks.
        const shells = (await caches.keys()).filter((key) => key.startsWith('torimtg-shell-'));
        for (const key of shells.slice(0, -2)) if (key !== SHELL) await caches.delete(key);
        await run();
    })());
});
worker.addEventListener('message', (event) => {
    const message = event.data as SyncWorkerRequest | undefined;
    if (message?.protocolVersion !== SYNC_PROTOCOL_VERSION || !event.source || !('url' in event.source) || new URL(event.source.url).origin !== worker.location.origin) return;
    const port = event.ports[0];
    function reply(error?: string) { port?.postMessage({ protocolVersion: SYNC_PROTOCOL_VERSION, ...(error ? { error } : {}) } satisfies SyncWorkerReply); }
    if (message.type === 'HELLO') { reply(); return; }
    if (message.type === 'WAKE') { reply(); event.waitUntil(run()); return; }
    if (message.type === 'AUTH') event.waitUntil((async function () {
        const auth = await store.auth();
        if (!auth.job || auth.job.id !== message.id) { reply('Sign-in request is no longer active.'); return; }
        try {
            if ((auth.pendingLogout || auth.job.type === 'login' || auth.job.type === 'setup') && auth.job.type !== 'logout' && await store.credentials()) await server.authenticate('logout');
            const session = await server.authenticate(auth.job.type, message.credentials);
            if (!session.serverInstanceId) throw new Error('The server does not support offline synchronization.');
            await store.finishAuth(message.id, session);
            reply(); await run();
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Sign in failed.';
            await store.finishAuth(message.id, null, reason); reply(reason);
        }
    })());
});
worker.addEventListener('sync' as 'message', (raw) => {
    const event = raw as unknown as ExtendableEvent & { tag: string };
    if (event.tag === 'torimtg-sync') event.waitUntil(run());
});

worker.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const sameOrigin = url.origin === worker.location.origin;
    if (sameOrigin && url.pathname.startsWith('/__tori_blob/')) {
        event.respondWith((async function () {
            const scope = await store.scope();
            if (!scope) return new Response('Sign in required', { status: 401 });
            const id = url.pathname.split('/').pop()!;
            const local = await store.getBlob(scope, id);
            if (local) return new Response(local.data);
            const saved = await coordinator.download(scope, { type: 'blob', id }, 20000);
            return saved ? new Response(saved.body) : new Response('Image unavailable offline', { status: 404 });
        })());
        return;
    }
    if (sameOrigin && request.mode === 'navigate' && !url.pathname.startsWith('/api/')) {
        event.respondWith((async function () {
            const cached = await (await caches.open(SHELL)).match('/index.html');
            return cached || fetch(request);
        })());
        return;
    }
    // API data is exclusively handled by the core. Only static media is cached here.
    const asset = sameOrigin && (/^\/(assets|ocr|mana-symbols)\//.test(url.pathname) || /\.(woff2?|wasm|png|ico)$/.test(url.pathname));
    const image = /\/images\//.test(url.pathname);
    if (!asset && !image) return;
    event.respondWith((async function () {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
            const response = await fetch(request);
            if (response.ok) {
                const cache = await caches.open(MEDIA);
                await cache.put(request, response.clone());
                const keys = await cache.keys();
                for (const old of keys.slice(0, -150)) await cache.delete(old);
            }
            return response;
        } catch {
            if (request.destination === 'image') return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="336"><rect width="100%" height="100%" fill="#242a30"/><text x="50%" y="50%" text-anchor="middle" fill="#ddd" font-family="sans-serif" font-size="13">Image unavailable offline</text></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
            return Response.error();
        }
    })());
});

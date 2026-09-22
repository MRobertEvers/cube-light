/// <reference lib="webworker" />
import { IndexedDbLocalStore } from '../torimtg/adapters/local-store';
import { HttpServerApi } from '../torimtg/adapters/server-api';
import { SyncCoordinator } from '../torimtg/worker/coordinator';
import type { LocalNotice } from '../torimtg/types';
import { API_URI } from '../config/api-url';

declare const __PRECACHE__: string[];
declare const __BUILD_ID__: string;
const worker = self as unknown as ServiceWorkerGlobalScope;
const store = new IndexedDbLocalStore();
const server = new HttpServerApi(API_URI, store);
const coordinator = new SyncCoordinator(store, server, notify);
const SHELL = `torimtg-shell-${__BUILD_ID__}`;
const MEDIA = 'torimtg-media-v1';

async function notify(notice: LocalNotice): Promise<void> {
    for (const client of await worker.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ protocolVersion: 1, type: 'LOCAL_CHANGED', notice });
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
        for (const client of await worker.clients.matchAll()) client.postMessage({ protocolVersion: 1, type: 'SYNC_PENDING' });
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
    const message = event.data;
    if (message?.protocolVersion !== 1 || !event.source || !('url' in event.source) || new URL(event.source.url).origin !== worker.location.origin) return;
    const port = event.ports[0];
    function reply(error?: string) { port?.postMessage({ protocolVersion: 1, ...(error ? { error } : {}) }); }
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
            let data = await store.dataset(scope);
            let saved = data.resources.find((entry) => entry.key === JSON.stringify({ id, type: 'blob' }));
            if (!saved) {
                await store.refresh(scope, { type: 'blob', id });
                await run();
                data = await store.dataset(scope);
                saved = data.resources.find((entry) => entry.key === JSON.stringify({ id, type: 'blob' }));
            }
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

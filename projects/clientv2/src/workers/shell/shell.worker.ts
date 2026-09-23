/// <reference lib="webworker" />

/**
 * ShellWorker: the service worker that lets the app start with no network. It serves
 * the built HTML, JavaScript, CSS and static assets from Cache Storage and nothing
 * else: API requests, sync, and saved data never pass through it.
 */

declare const __PRECACHE__: string[];
declare const __BUILD_ID__: string;
const worker = self as unknown as ServiceWorkerGlobalScope;
const SHELL_PREFIX = 'torimtg-shell-';
const SHELL = `${SHELL_PREFIX}${__BUILD_ID__}`;
const STATIC = 'torimtg-static-v1';
const STATIC_LIMIT = 200;

worker.addEventListener('install', (event) => {
	event.waitUntil((async function () {
		await (await caches.open(SHELL)).addAll(__PRECACHE__);
		// Take over at once; tabs on the previous build keep loading its chunks from the kept shell.
		await worker.skipWaiting();
	})());
});

worker.addEventListener('activate', (event) => {
	event.waitUntil((async function () {
		await worker.clients.claim();
		const keys = await caches.keys();
		const shells = keys.filter((key) => key.startsWith(SHELL_PREFIX) && key !== SHELL);
		// Keep the previous shell for tabs still running it; drop older ones and anything else ours.
		const keep = new Set([SHELL, STATIC, shells[shells.length - 1]]);
		for (const key of keys) if (key.startsWith('torimtg-') && !keep.has(key)) await caches.delete(key);
	})());
});

worker.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== worker.location.origin || url.pathname.startsWith('/api/')) return;
	if (request.mode === 'navigate') {
		event.respondWith((async function () {
			const shell = await (await caches.open(SHELL)).match('/index.html');
			return shell || fetch(request);
		})());
		return;
	}
	if (!/^\/(assets|mana-symbols)\//.test(url.pathname) && !/\.(png|ico|webmanifest)$/.test(url.pathname)) return;
	event.respondWith((async function () {
		const cached = await (await caches.open(SHELL)).match(request) || await caches.match(request);
		if (cached) return cached;
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(STATIC);
			await cache.put(request, response.clone());
			const keys = await cache.keys();
			for (const old of keys.slice(0, -STATIC_LIMIT)) await cache.delete(old);
		}
		return response;
	})());
});

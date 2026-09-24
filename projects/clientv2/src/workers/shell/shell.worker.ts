/// <reference lib="webworker" />

/**
 * ShellWorker: the service worker that lets the app start with no network. It serves
 * the built HTML, JavaScript, CSS and static assets from Cache Storage and nothing
 * else: API requests, sync, and saved data never pass through it.
 *
 * Registered as `/sw.js?mode=development` by the dev server, it goes network-first
 * instead: every request reaches the dev server so edits show at once, and the last
 * copy of each one is kept for when the server cannot be reached.
 */

declare const __PRECACHE__: string[];
declare const __BUILD_ID__: string;
const worker = self as unknown as ServiceWorkerGlobalScope;
const DEVELOPMENT = new URL(worker.location.href).searchParams.get('mode') === 'development';
const SHELL_PREFIX = 'torimtg-shell-';
const SHELL = `${SHELL_PREFIX}${__BUILD_ID__}`;
const STATIC = 'torimtg-static-v1';
const STATIC_LIMIT = 200;
// A new dev server start has a new build id, which drops what the last one cached.
const DEV = `torimtg-dev-${__BUILD_ID__}`;

worker.addEventListener('install', (event) => {
	event.waitUntil((async function () {
		if (!DEVELOPMENT) await (await caches.open(SHELL)).addAll(__PRECACHE__);
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
		const keep = DEVELOPMENT ? new Set([DEV]) : new Set([SHELL, STATIC, shells[shells.length - 1]]);
		for (const key of keys) if (key.startsWith('torimtg-') && !keep.has(key)) await caches.delete(key);
	})());
});

worker.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== worker.location.origin || url.pathname.startsWith('/api/')) return;
	if (DEVELOPMENT) {
		// Vite's client pings the server to learn when it is back; a cached answer would fool it.
		if (request.headers.get('accept') === 'text/x-vite-ping') return;
		event.respondWith(networkFirst(request, url));
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith((async function () {
			const shell = await (await caches.open(SHELL)).match('/index.html');
			return shell || fetch(request);
		})());
		return;
	}
	if (!/^\/assets\//.test(url.pathname) && !/\.(png|ico|webmanifest)$/.test(url.pathname)) return;
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

/** The dev server's response, kept for later; the kept copy only when the server cannot be reached. */
async function networkFirst(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(DEV);
	// Every page is the same index.html, so one copy serves any route offline.
	const key = request.mode === 'navigate' ? '/' : request;
	try {
		const response = await fetch(request);
		// Hot updates add ?t= to the module URL; the next page load asks for it without one.
		if (response.ok && !url.searchParams.has('t')) await cache.put(key, response.clone());
		return response;
	} catch (error) {
		const cached = await cache.match(key);
		if (cached) return cached;
		throw error;
	}
}

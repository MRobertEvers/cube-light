/// <reference lib="webworker" />

/**
 * ShellWorker: the service worker that lets the app start with no network. It serves
 * the built HTML, JavaScript, CSS and static assets from Cache Storage and nothing
 * else: API requests, sync, and saved data never pass through it.
 *
 * It is built with a release (`npm run release`, or `npm run build` for a deployment) and
 * precaches that release. Pages load from the release unless the device is in
 * development mode (ShellWorkerClient.setMode), which loads them from the development
 * server and falls back to the release when the server cannot be reached.
 *
 * With no release built, the dev server serves it with nothing to precache, and every
 * request goes to the network.
 */

declare const __PRECACHE__: string[];
declare const __SHELL_PAGE__: string;
declare const __BUILD_ID__: string;
// The release's build info (src/domain/models/build-info.ts); null with no release.
declare const __RELEASE__: unknown;
const worker = self as unknown as ServiceWorkerGlobalScope;
const RELEASED = __PRECACHE__.length > 0;
const SHELL_PREFIX = 'torimtg-shell-';
const SHELL = `${SHELL_PREFIX}${__BUILD_ID__}`;
const STATIC = 'torimtg-static-v1';
const STATIC_LIMIT = 200;
// Written by ShellWorkerClient.setMode; holds 'development' or 'release'.
const SETTINGS = 'torimtg-settings';
const MODE_KEY = '/shell-mode';
// The active worker's release, for the Profile page to show even while running development.
const RELEASE_KEY = '/shell-release';
// How long a page load waits for the development server before using the release.
const DEV_SERVER_TIMEOUT_MS = 4000;

worker.addEventListener('install', (event) => {
	event.waitUntil((async function () {
		if (RELEASED) await (await caches.open(SHELL)).addAll(__PRECACHE__);
		// Take over at once; tabs on the previous build keep loading its chunks from the kept shell.
		await worker.skipWaiting();
	})());
});

worker.addEventListener('activate', (event) => {
	event.waitUntil((async function () {
		await worker.clients.claim();
		if (RELEASED) await (await caches.open(SETTINGS)).put(RELEASE_KEY, new Response(JSON.stringify(__RELEASE__)));
		const keys = await caches.keys();
		const shells = keys.filter((key) => key.startsWith(SHELL_PREFIX) && key !== SHELL);
		// Keep the previous shell for tabs still running it; drop older ones and anything else ours.
		const keep = new Set([SHELL, STATIC, SETTINGS, shells[shells.length - 1]]);
		for (const key of keys) if (key.startsWith('torimtg-') && !keep.has(key)) await caches.delete(key);
	})());
});

worker.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== worker.location.origin || url.pathname.startsWith('/api/')) return;
	if (request.mode === 'navigate') {
		if (RELEASED) event.respondWith(page(request));
		return;
	}
	// Everything else a development page loads (/src/, /@vite/, /node_modules/) goes to the server.
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

/** Every route is the same page: the development server's in development mode when it answers, else the release's. */
async function page(request: Request): Promise<Response> {
	if (await developmentMode()) {
		const response = await withinTimeout(fetch(request), DEV_SERVER_TIMEOUT_MS).catch(() => null);
		if (response) return response;
	}
	const shell = await (await caches.open(SHELL)).match(__SHELL_PAGE__);
	return shell || fetch(request);
}

async function developmentMode(): Promise<boolean> {
	const saved = await (await caches.open(SETTINGS)).match(MODE_KEY);
	return saved ? (await saved.text()) === 'development' : false;
}

/** The promise's result, or a rejection once `ms` pass; a navigation request cannot take an abort signal. */
function withinTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise(function (resolve, reject) {
		const timer = setTimeout(function () {
			reject(new Error('timed out'));
		}, ms);
		promise.then(
			function (value) {
				clearTimeout(timer);
				resolve(value);
			},
			function (error) {
				clearTimeout(timer);
				reject(error);
			}
		);
	});
}

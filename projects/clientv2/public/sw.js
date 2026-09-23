// The app no longer uses a service worker. Browsers that installed the old one
// check this URL for updates; this version clears its caches, unregisters itself,
// and reloads open tabs so they load the current app from the network.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
    event.waitUntil((async function () {
        for (const key of await caches.keys()) if (key.startsWith('torimtg-')) await caches.delete(key);
        await self.registration.unregister();
        for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
    })());
});

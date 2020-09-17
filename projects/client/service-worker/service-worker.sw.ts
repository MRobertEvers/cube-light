declare var self: ServiceWorkerGlobalScope;

self.addEventListener('install', (event) => {
	console.log('V1 installing…');

	// cache a cat SVG
	event.waitUntil(
		caches.open('static-v1').then((cache) => {
			cache.addAll(['/index.html']);
		})
	);
});

self.addEventListener('activate', (event) => {
	console.log('V1 now ready to handle fetches!');
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// serve the cat SVG from the cache if the request is
	// same-origin and the path is '/dog.svg'
	if (url.origin == location.origin && url.pathname == '/res/z.png') {
		// event.respondWith(caches.match('/res/z-2.png'));
	} else {
		event.respondWith(
			caches.match(event.request).then((response) => {
				return response || fetch(event.request);
			})
		);
	}
});

export function hello() {}

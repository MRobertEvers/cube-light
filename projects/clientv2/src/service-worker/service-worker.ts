export function register() {
	if (typeof navigator !== 'undefined') {
		navigator.serviceWorker
			.register('./service-worker.sw.js')
			.then((reg) => console.log('SW registered!', reg))
			.catch((err) => console.log('Boo!', err));
	}
}

/**
 * Registers ShellWorker, which caches the built app so it can start offline. It is an
 * enhancement: where it cannot register (an insecure origin such as a plain-HTTP LAN
 * address, an untrusted certificate, private browsing) the app works the same but
 * needs the network to load.
 */
export class ShellWorkerClient {
	/** Registers the worker for production builds; in development, removes any left over. */
	start(production: boolean): void {
		if (!('serviceWorker' in navigator) || !isSecureContext) return;
		if (!production) {
			// A cached shell would hide the dev server's changes.
			void navigator.serviceWorker.getRegistrations()
				.then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
				.catch(() => undefined);
			return;
		}
		void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => undefined);
	}
}

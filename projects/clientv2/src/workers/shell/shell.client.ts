import type { OfflineShellStatus } from '../../domain/models/offline-shell';
import type { OfflineShell } from '../../engine/ports';

/**
 * Registers ShellWorker, which caches the built app so it can start offline. It is an
 * enhancement: where it cannot register (an insecure origin such as a plain-HTTP LAN
 * address, an untrusted certificate, private browsing) the app works the same but
 * needs the network to load.
 */
export class ShellWorkerClient implements OfflineShell {
	private readonly production: boolean;
	private registration: Promise<ServiceWorkerRegistration | null> = Promise.resolve(null);

	constructor(production: boolean) {
		this.production = production;
	}

	/** Registers the worker; in development it goes network-first so the dev server's changes show. */
	start(): void {
		if (!('serviceWorker' in navigator) || !isSecureContext) return;
		const url = this.production ? '/sw.js' : '/sw.js?mode=development';
		this.registration = navigator.serviceWorker
			.register(url, { scope: '/', updateViaCache: 'none' })
			.catch(() => null);
	}

	watch(listener: (status: OfflineShellStatus) => void): () => void {
		if (!('serviceWorker' in navigator)) {
			listener('unsupported');
			return function () {};
		}
		if (!isSecureContext) {
			listener('insecure');
			return function () {};
		}
		let stopped = false;
		let watched: ServiceWorker | null = null;
		let registration: ServiceWorkerRegistration | null = null;
		function report() {
			if (stopped) return;
			const installing = registration?.installing ?? registration?.waiting ?? null;
			if (installing !== watched) {
				watched?.removeEventListener('statechange', report);
				installing?.addEventListener('statechange', report);
				watched = installing;
			}
			listener(registration?.active ? 'installed' : installing ? 'installing' : 'not-installed');
		}
		listener('installing');
		void this.registration.then(function (found) {
			if (stopped) return;
			registration = found;
			registration?.addEventListener('updatefound', report);
			report();
		});
		navigator.serviceWorker.addEventListener('controllerchange', report);
		return function () {
			stopped = true;
			watched?.removeEventListener('statechange', report);
			registration?.removeEventListener('updatefound', report);
			navigator.serviceWorker.removeEventListener('controllerchange', report);
		};
	}
}

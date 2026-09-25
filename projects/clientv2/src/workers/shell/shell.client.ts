import type { OfflineShellStatus } from '../../domain/models/offline-shell';
import type { BuildInfo, ShellMode } from '../../domain/models/build-info';
import type { OfflineShell } from '../../engine/ports';

// Shared with ShellWorker, which reads the mode on every page load.
const SETTINGS = 'torimtg-settings';
const MODE_KEY = '/shell-mode';
const RELEASE_KEY = '/shell-release';

/**
 * Registers ShellWorker, which caches the built app so it can start offline. It is an
 * enhancement: where it cannot register (an insecure origin such as a plain-HTTP LAN
 * address, an untrusted certificate, private browsing) the app works the same but
 * needs the network to load.
 *
 * The worker loads pages from the last release unless this device is in development mode,
 * which loads them from the development server while it answers.
 */
export class ShellWorkerClient implements OfflineShell {
	private readonly build: BuildInfo;
	private registration: Promise<ServiceWorkerRegistration | null> = Promise.resolve(null);

	constructor(build: BuildInfo) {
		this.build = build;
	}

	start(): void {
		if (!('serviceWorker' in navigator) || !isSecureContext) return;
		this.registration = navigator.serviceWorker
			.register('/sw.js', { scope: '/', updateViaCache: 'none' })
			.catch(() => null);
	}

	running(): BuildInfo {
		return this.build;
	}

	async installedRelease(): Promise<BuildInfo | null> {
		if (!('caches' in self)) return null;
		const saved = await (await caches.open(SETTINGS)).match(RELEASE_KEY);
		if (!saved) return null;
		try {
			const info = (await saved.json()) as BuildInfo | null;
			return info && info.channel === 'release' ? info : null;
		} catch {
			return null;
		}
	}

	async mode(): Promise<ShellMode> {
		if (!('caches' in self)) return 'release';
		const saved = await (await caches.open(SETTINGS)).match(MODE_KEY);
		return saved && (await saved.text()) === 'development' ? 'development' : 'release';
	}

	async setMode(mode: ShellMode): Promise<void> {
		await (await caches.open(SETTINGS)).put(MODE_KEY, new Response(mode));
		location.reload();
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

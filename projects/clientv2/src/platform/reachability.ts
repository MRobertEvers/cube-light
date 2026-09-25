import type { Connectivity } from '../domain/models/connectivity';
import type { Reachability, ReachabilityReport } from '../engine/ports';

/**
 * Whether the server can be reached. The browser's offline event says so at once; after
 * that, each server request the transport reports decides it. The browser's online event
 * alone does not: a network can be up while the server is not.
 */
export class BrowserReachability implements Reachability, ReachabilityReport {
	private connectivity: Connectivity = navigator.onLine ? 'online' : 'offline';
	private readonly listeners = new Set<(connectivity: Connectivity) => void>();

	constructor() {
		window.addEventListener('offline', () => this.set('offline'));
	}

	current(): Connectivity {
		return this.connectivity;
	}

	watch(listener: (connectivity: Connectivity) => void): () => void {
		const listeners = this.listeners;
		listeners.add(listener);
		return function stop() {
			listeners.delete(listener);
		};
	}

	answered(): void {
		this.set('online');
	}

	unanswered(): void {
		this.set('offline');
	}

	private set(connectivity: Connectivity): void {
		if (connectivity === this.connectivity) return;
		this.connectivity = connectivity;
		for (const listener of this.listeners) listener(connectivity);
	}
}

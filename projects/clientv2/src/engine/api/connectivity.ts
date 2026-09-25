import type { Connectivity } from '../../domain/models/connectivity';
import type { EngineEvents } from '../events';
import type { Reachability, SyncHost } from '../ports';

// How often sync tries the server while it cannot be reached.
const OFFLINE_RETRY_MS = 20000;

/**
 * Whether the server can be reached, published as connectivity-changed events. While it
 * cannot, sync is woken every 20 seconds: its pull finds out when the server is back,
 * which the browser does not report when only the server was down.
 */
export class ConnectivityApi {
	private readonly reachability: Reachability;
	private retry: ReturnType<typeof setInterval> | null = null;

	constructor(reachability: Reachability, syncHost: Pick<SyncHost, 'wake'>, events: EngineEvents) {
		this.reachability = reachability;
		const retryWhileOffline = (connectivity: Connectivity) => {
			if (connectivity === 'offline' && !this.retry) {
				this.retry = setInterval(function () {
					void syncHost.wake();
				}, OFFLINE_RETRY_MS);
			} else if (connectivity === 'online' && this.retry) {
				clearInterval(this.retry);
				this.retry = null;
			}
		};
		retryWhileOffline(reachability.current());
		reachability.watch(function (connectivity) {
			retryWhileOffline(connectivity);
			events.emit({ type: 'connectivity-changed', connectivity });
		});
	}

	current(): Connectivity {
		return this.reachability.current();
	}
}

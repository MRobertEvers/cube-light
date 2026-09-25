import type { LocalSnapshot } from '@torimtg/core';
import type { WorkItem } from '../domain/models/work';
import type { Connectivity } from '../domain/models/connectivity';
import type { ImageScanTask } from '../domain/scans/image-scan-task';

/** Sync progress, as the offline indicator shows it. */
export type SyncStatus = Pick<
	LocalSnapshot,
	'localRevision' | 'pendingCount' | 'conflictCount' | 'refresh' | 'lastValidatedAt' | 'lastError'
>;

/** Everything the engine tells the page. Events say what changed; readers fetch what they show. */
export type EngineEvent =
	/** Saved data changed. `account` is empty once the person has signed out. */
	| { type: 'data-changed'; account: string; revision: number }
	| { type: 'sync-status'; status: SyncStatus }
	/** The server became reachable, or stopped being. */
	| { type: 'connectivity-changed'; connectivity: Connectivity }
	/** The session ended while the app was open: signed out elsewhere, or refused by the server. */
	| { type: 'session-expired' }
	| { type: 'work-queue-changed'; items: WorkItem[] | null; error: boolean }
	| { type: 'scans-changed'; scans: ImageScanTask[] };

/** The engine's event bus. Jobs and the change feed publish; state projections subscribe. */
export class EngineEvents {
	private readonly listeners = new Set<(event: EngineEvent) => void>();

	subscribe(listener: (event: EngineEvent) => void): () => void {
		const listeners = this.listeners;
		listeners.add(listener);
		return function unsubscribe() {
			listeners.delete(listener);
		};
	}

	emit(event: EngineEvent): void {
		for (const listener of this.listeners) listener(event);
	}
}

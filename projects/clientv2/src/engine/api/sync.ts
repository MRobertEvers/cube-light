import type { Intent, ToriMTG } from '../core/types';

/** What is waiting to sync, and the choices for edits the server refused. */
export class SyncApi {
	private readonly tori: ToriMTG;

	constructor(tori: ToriMTG) {
		this.tori = tori;
	}

	/** Edits saved on this device that the server has not accepted yet. */
	pendingEdits(): Promise<Intent[]> {
		return this.tori.pending();
	}

	/** Sends a refused edit again against the latest state, with the edits that depend on it. */
	keepMine(editId: string): Promise<void> {
		return this.tori.commands.resolve(editId, 'mine');
	}

	/** Drops a refused edit, and the edits that depend on it, in favour of the server's state. */
	useServer(editId: string): Promise<void> {
		return this.tori.commands.resolve(editId, 'server');
	}

	/** Every unsynced edit and its images, as a JSON file the person can keep. */
	exportUnsynced(): Promise<Blob> {
		return this.tori.exportPending();
	}

	/** Syncs now, including edits waiting out a retry delay. */
	retryNow(): Promise<void> {
		return this.tori.queries.requestRefresh();
	}
}

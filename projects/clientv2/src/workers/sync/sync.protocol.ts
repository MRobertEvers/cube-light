/** Messages between the page (SyncWorkerClient) and SyncWorker, the service worker that runs sync. */

export const SYNC_PROTOCOL_VERSION = 1;

/** What changed in local storage. It says "reread"; it never carries data. */
export type SyncNotice = { partition: string; generation: number; localRevision: number };

/** Page → SyncWorker. Each request carries a MessagePort for its reply. */
export type SyncWorkerRequest = { protocolVersion: typeof SYNC_PROTOCOL_VERSION } & (
	| { type: 'HELLO' }
	| { type: 'WAKE' }
	| { type: 'AUTH'; id: string; credentials?: { username: string; password: string } }
);

/** SyncWorker → page, on the request's port. */
export type SyncWorkerReply = { protocolVersion: typeof SYNC_PROTOCOL_VERSION; error?: string };

/** SyncWorker → every open tab. */
export type SyncWorkerBroadcast = { protocolVersion: typeof SYNC_PROTOCOL_VERSION } & (
	| { type: 'LOCAL_CHANGED'; notice: SyncNotice }
	| { type: 'SYNC_PENDING' }
);

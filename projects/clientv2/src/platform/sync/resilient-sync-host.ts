import type { LocalNotice } from '../../engine/core/types';
import type { SyncHost, SyncHostKind } from '../../engine/ports';
import type { InThreadSyncHost } from './in-thread-sync-host';
import type { BlobUrls } from '../blob-urls';

/**
 * Picks the sync host once, on first use, and remembers the choice.
 *
 * Capability alone is not enough to decide. A service worker needs a secure
 * context, but a secure context does not guarantee registration: an untrusted
 * certificate, a storage policy, or private browsing can all refuse it. Any
 * such refusal used to surface as "Can't reach the server", because nothing
 * else could talk to the API. Falling back to the window host keeps the app
 * working, at the cost of offline start-up and background wake-ups.
 */
export class ResilientSyncHost implements SyncHost {
    private readonly worker: SyncHost;
    private readonly createFallback: () => InThreadSyncHost;
    private readonly blobs: BlobUrls;
    private readonly listeners = new Set<(notice: LocalNotice) => void>();
    private host: Promise<SyncHost> | null = null;
    private kind: SyncHostKind = 'pending';

    /** `createFallback` builds the in-thread host only if the worker cannot start. */
    constructor(worker: SyncHost, createFallback: () => InThreadSyncHost, blobs: BlobUrls) {
        this.worker = worker; this.createFallback = createFallback; this.blobs = blobs;
    }

    get hostKind(): SyncHostKind { return this.kind; }

    private choose(): Promise<SyncHost> {
        if (this.host) return this.host;
        this.host = (async () => {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && isSecureContext) {
                const worker = this.worker;
                try {
                    await worker.connect();
                    this.kind = 'worker';
                    worker.subscribe((notice) => this.emit(notice));
                    return worker;
                } catch { /* Registration was refused; use the window instead. */ }
            }
            const fallback = this.createFallback();
            this.kind = 'window';
            this.blobs.useObjectUrls(fallback.announce);
            fallback.subscribe((notice) => this.emit(notice));
            return fallback;
        })();
        return this.host;
    }

    private emit(notice: LocalNotice): void {
        for (const listener of this.listeners) listener(notice);
    }

    async connect(): Promise<void> { await this.choose(); }
    async wake(): Promise<void> { await (await this.choose()).wake(); }
    async authenticate(id: string, credentials?: { username: string; password: string }): Promise<void> {
        await (await this.choose()).authenticate(id, credentials);
    }
    subscribe(listener: (notice: LocalNotice) => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
}

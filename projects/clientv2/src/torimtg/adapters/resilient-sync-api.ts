import type { LocalNotice, LocalStore, ServiceWorkerApi } from '../types';
import { BrowserServiceWorkerApi } from './service-worker-api';
import { WindowSyncApi } from './window-sync-api';
import { installBlobUrls } from './window-blobs';

export type SyncHostKind = 'pending' | 'worker' | 'window';

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
export class ResilientSyncApi implements ServiceWorkerApi {
    private readonly store: LocalStore;
    private readonly listeners = new Set<(notice: LocalNotice) => void>();
    private host: Promise<ServiceWorkerApi> | null = null;
    private kind: SyncHostKind = 'pending';

    constructor(store: LocalStore) { this.store = store; }

    get hostKind(): SyncHostKind { return this.kind; }

    private choose(): Promise<ServiceWorkerApi> {
        if (this.host) return this.host;
        this.host = (async () => {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && isSecureContext) {
                const worker = new BrowserServiceWorkerApi();
                try {
                    await worker.connect();
                    this.kind = 'worker';
                    worker.subscribe((notice) => this.emit(notice));
                    return worker;
                } catch { /* Registration was refused; use the window instead. */ }
            }
            const window = new WindowSyncApi(this.store);
            this.kind = 'window';
            installBlobUrls(this.store, window.announce);
            window.subscribe((notice) => this.emit(notice));
            return window;
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

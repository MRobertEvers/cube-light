import type { LocalNotice, LocalStore } from '../../engine/core/types';
import type { Crypto, SyncHost, SyncHostKind, SyncTransport } from '../../engine/ports';
import { SyncCoordinator } from '../../engine/sync/sync-coordinator';

// A service worker needs a secure context, which a LAN dev origin such as
// http://host.local:3000 is not. This host runs the same SyncCoordinator on the
// window instead, so the transport, retry, and lease behaviour stay identical;
// only the shell/media caching and background wake-ups of the worker are lost.
// Production over HTTPS still uses SyncWorker.
export class InThreadSyncHost implements SyncHost {
    readonly hostKind: SyncHostKind = 'window';
    private readonly store: LocalStore;
    private readonly server: SyncTransport;
    private readonly coordinator: SyncCoordinator;
    private readonly listeners = new Set<(notice: LocalNotice) => void>();
    private running: Promise<void> | null = null;
    private queued = false;
    private followUp: ReturnType<typeof setTimeout> | null = null;

    constructor(store: LocalStore, server: SyncTransport, crypto: Crypto) {
        this.store = store;
        this.server = server;
        this.coordinator = new SyncCoordinator(store, server, crypto, async (notice) => { this.announce(notice); });
    }

    // Also used by the blob resolver to re-project a view once an object URL exists.
    announce = (notice: LocalNotice): void => {
        for (const listener of this.listeners) listener(notice);
    };

    // The worker serialises runs through its event loop; do the same here so a
    // burst of wake() calls cannot start overlapping passes.
    private run(): Promise<void> {
        if (this.running) { this.queued = true; return this.running; }
        this.running = this.pass().finally(() => {
            this.running = null;
            if (!this.queued) return;
            this.queued = false;
            void this.run();
        });
        return this.running;
    }

    private async pass(): Promise<void> {
        const auth = await this.store.auth();
        if (auth.pendingLogout && auth.job?.type === 'logout') {
            try { await this.store.finishAuth(auth.job.id, await this.server.authenticate('logout')); }
            catch { return; }
        }
        const remains = await this.coordinator.run().catch(() => false);
        // Background Sync belongs to the worker. Retry on a timer instead.
        if (remains && !this.followUp) this.followUp = setTimeout(() => { this.followUp = null; void this.run(); }, 1000);
    }

    connect(): Promise<void> { return Promise.resolve(); }

    async wake(): Promise<void> { await this.run(); }

    async authenticate(id: string, credentials?: { username: string; password: string }): Promise<void> {
        const auth = await this.store.auth();
        if (!auth.job || auth.job.id !== id) throw new Error('Sign-in request is no longer active.');
        try {
            if ((auth.pendingLogout || auth.job.type === 'login' || auth.job.type === 'setup') && auth.job.type !== 'logout' && await this.store.credentials()) await this.server.authenticate('logout');
            const session = await this.server.authenticate(auth.job.type, credentials);
            if (!session.serverInstanceId) throw new Error('The server does not support offline synchronization.');
            await this.store.finishAuth(id, session);
        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Sign in failed.';
            await this.store.finishAuth(id, null, reason);
            throw new Error(reason);
        }
        await this.run();
    }

    subscribe(listener: (notice: LocalNotice) => void): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
}

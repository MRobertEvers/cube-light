import type { DomainCommand } from '@torimtg/core';
import type { LocalNotice, LocalStore, ServerApi } from '../types';
import { outstanding } from '../adapters/local-store';
import { TransportError } from '../adapters/server-api';
import { randomUUID } from '../adapters/web-crypto';

function blobIds(command: DomainCommand): string[] {
    if (command.type === 'work.queue') return [command.blobId];
    if (command.type === 'deck.blend') return Object.values(command.blend.images);
    return [];
}

function retryTime(attempts: number, error: unknown): number {
    return Math.max(error instanceof TransportError ? error.retryAfter : 0, Date.now() + Math.min(300000, 2000 * 2 ** Math.min(attempts, 7)) * (0.75 + Math.random() * .5));
}

export class SyncCoordinator {
    private readonly store: LocalStore;
    private readonly server: ServerApi;
    private readonly notify: (notice: LocalNotice) => Promise<void>;
    constructor(store: LocalStore, server: ServerApi, notify: (notice: LocalNotice) => Promise<void>) {
        this.store = store; this.server = server; this.notify = notify;
    }

    async run(): Promise<boolean> {
        const scope = await this.store.scope();
        if (!scope) return false;
        const lease = await this.store.acquire(scope, randomUUID());
        if (!lease) return false;
        const deadline = Date.now() + 20000;
        let workRemains = false;
        try {
            let data = await this.store.dataset(scope);
            if (data.meta.refresh === 'auth-required' || data.meta.nextAttemptAt > Date.now()) return false;
            // Bounded write priority, then a pull and resource jobs prevent read starvation.
            for (let count = 0; count < 8 && Date.now() < deadline; count++) {
                const intent = await this.store.prepare(lease);
                if (!intent) break;
                try {
                    for (const id of blobIds(intent.command)) {
                        let blob = await this.store.getBlob(scope, id);
                        if (!blob) continue; // A referenced server blob may not be downloaded locally.
                        while (blob.uploaded < blob.data.size) {
                            if (Date.now() >= deadline) return true;
                            await this.store.renew(lease);
                            const received = await this.server.upload(scope, blob);
                            await this.store.uploaded(lease, id, received);
                            blob = { ...blob, uploaded: received };
                        }
                    }
                    await this.store.renew(lease);
                    const outcome = await this.server.command(intent.prepared!);
                    await this.notify(await this.store.settle(lease, outcome));
                } catch (error) {
                    const status = error instanceof TransportError ? error.status : 0;
                    await this.store.fail(lease, intent.operationId, error instanceof Error ? error.message : 'Synchronization failed.', retryTime(intent.attempts, error), status >= 400 && status < 500 && ![401, 408, 429].includes(status), status === 401);
                    if (!status || [401, 408, 429].includes(status) || status >= 500) return false;
                }
            }
            if (Date.now() >= deadline) return true;
            data = await this.store.dataset(scope);
            try {
                await this.store.renew(lease);
                const uncertain = data.intents.filter((intent) => outstanding(intent) && intent.prepared).map((intent) => intent.operationId);
                const page = await this.server.pull(scope, data.meta, uncertain.slice(0, 500));
                await this.notify(await this.store.settle(lease, page));
                workRemains = page.hasMore;
            } catch (error) {
                await this.store.fail(lease, null, error instanceof Error ? error.message : 'Refresh failed.', retryTime(1, error), false, error instanceof TransportError && error.status === 401);
                return false;
            }
            for (const job of await this.store.jobs(scope)) {
                if (Date.now() >= deadline) { workRemains = true; break; }
                try {
                    await this.store.renew(lease);
                    const resource = await this.server.resource(job.query);
                    await this.notify(await this.store.saveResource(lease, job, resource));
                } catch (error) {
                    await this.store.failResource(lease, job, error instanceof Error ? error.message : 'Download failed.', retryTime(job.attempts, error));
                }
            }
            const final = await this.store.dataset(scope);
            return workRemains || final.intents.some((intent) => ['queued', 'sending'].includes(intent.status) && intent.nextAttemptAt <= Date.now() && (!intent.dependsOn || final.intents.find((previous) => previous.operationId === intent.dependsOn)?.status === 'accepted') && (!intent.deckDependsOn || final.intents.find((previous) => previous.operationId === intent.deckDependsOn)?.status === 'accepted'));
        } finally {
            const data = await this.store.dataset(scope).catch(() => null);
            if (data) await this.notify({ partition: scope.partition, generation: scope.generation, localRevision: data.meta.revision });
            await this.store.release(lease);
        }
    }
}

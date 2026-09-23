import type { LocalNotice, LocalStore } from '../engine/core/types';
import type { BlobUrlResolver } from '../engine/ports';

/**
 * Turns a local blob id into a URL an <img> can load.
 *
 * The service worker answers /__tori_blob/<id> from its fetch handler. Without one
 * nothing answers that path, so once the window hosts sync it resolves ids to object
 * URLs instead. Lookups are synchronous because projections are; a miss returns the
 * worker path, starts the read, and announces a revision bump so the view projects again.
 */
export class BlobUrls implements BlobUrlResolver {
    private readonly store: LocalStore;
    private readonly objectUrls = new Map<string, string>();
    private readonly pending = new Set<string>();
    private announce: ((notice: LocalNotice) => void) | null = null;

    constructor(store: LocalStore) { this.store = store; }

    /** Switches to object URLs, announcing each one through `announce` once it is ready. */
    useObjectUrls(announce: (notice: LocalNotice) => void): void { this.announce = announce; }

    url(id: string): string {
        if (!id || !this.announce) return `/__tori_blob/${id}`;
        const known = this.objectUrls.get(id);
        if (known) return known;
        if (!this.pending.has(id)) void this.load(id, this.announce);
        return `/__tori_blob/${id}`;
    }

    private async load(id: string, announce: (notice: LocalNotice) => void): Promise<void> {
        const store = this.store;
        this.pending.add(id);
        try {
            const scope = await store.scope();
            if (!scope) return;
            const local = await store.getBlob(scope, id);
            const data = await store.dataset(scope).then((set) => local?.data || set.resources.find((entry) => entry.key === JSON.stringify({ id, type: 'blob' }))?.body);
            if (!data) { await store.refresh(scope, { type: 'blob', id }); return; }
            this.objectUrls.set(id, URL.createObjectURL(data));
            announce({ partition: scope.partition, generation: scope.generation, localRevision: (await store.dataset(scope)).meta.revision });
        } catch { /* The image stays unavailable until the next projection. */ }
        finally { this.pending.delete(id); }
    }
}

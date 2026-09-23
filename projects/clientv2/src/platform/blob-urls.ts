import type { LocalNotice, LocalStore } from '../engine/core/types';
import type { BlobUrlResolver } from '../engine/ports';

/** Shown in place of a blob until its object URL exists. */
const LOADING = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/**
 * Turns a local blob id into an object URL an <img> can load.
 *
 * Lookups are synchronous because projections are; a miss returns a transparent
 * placeholder, starts the read (downloading the blob if it is not stored yet), and
 * announces a revision bump through `announce` so the view projects again.
 */
export class BlobUrls implements BlobUrlResolver {
    private readonly store: LocalStore;
    private readonly announce: (notice: LocalNotice) => void;
    private readonly objectUrls = new Map<string, string>();
    private readonly pending = new Set<string>();

    constructor(store: LocalStore, announce: (notice: LocalNotice) => void) {
        this.store = store;
        this.announce = announce;
    }

    url(id: string): string {
        if (!id) return LOADING;
        const known = this.objectUrls.get(id);
        if (known) return known;
        if (!this.pending.has(id)) void this.load(id);
        return LOADING;
    }

    private async load(id: string): Promise<void> {
        const store = this.store;
        this.pending.add(id);
        try {
            const scope = await store.scope();
            if (!scope) return;
            const local = await store.getBlob(scope, id);
            const data = await store.dataset(scope).then((set) => local?.data || set.resources.find((entry) => entry.key === JSON.stringify({ id, type: 'blob' }))?.body);
            if (!data) { await store.refresh(scope, { type: 'blob', id }); return; }
            this.objectUrls.set(id, URL.createObjectURL(data));
            this.announce({ partition: scope.partition, generation: scope.generation, localRevision: (await store.dataset(scope)).meta.revision });
        } catch { /* The image stays unavailable until the next projection. */ }
        finally { this.pending.delete(id); }
    }
}

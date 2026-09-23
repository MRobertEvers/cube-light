import type { LocalNotice, LocalStore } from '../types';
import { setBlobUrlResolver } from '../projections';

// Without a service worker nothing answers /__tori_blob/<id>, so images
// projected from local blobs would 404. Resolve those ids to object URLs here.
// Lookups are synchronous because projectQuery is; a miss returns null, starts
// the read, and announces a revision bump so the view projects again.
export function installBlobUrls(store: LocalStore, announce: (notice: LocalNotice) => void): void {
    const urls = new Map<string, string>();
    const pending = new Set<string>();
    setBlobUrlResolver(function (id) {
        const known = urls.get(id);
        if (known) return known;
        if (pending.has(id)) return null;
        pending.add(id);
        void (async function () {
            try {
                const scope = await store.scope();
                if (!scope) return;
                const local = await store.getBlob(scope, id);
                const data = await store.dataset(scope).then((set) => local?.data || set.resources.find((entry) => entry.key === JSON.stringify({ id, type: 'blob' }))?.body);
                if (!data) { await store.refresh(scope, { type: 'blob', id }); return; }
                urls.set(id, URL.createObjectURL(data));
                announce({ partition: scope.partition, generation: scope.generation, localRevision: (await store.dataset(scope)).meta.revision });
            } catch { /* The image stays unavailable until the next projection. */ }
            finally { pending.delete(id); }
        })();
        return null;
    });
}

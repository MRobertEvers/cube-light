import type { Query } from '@torimtg/core';
import { withCore } from './ui-api';

/**
 * Subscribe before reading; each invalidation rereads through a Redux thunk.
 * Local data is delivered at once, and a server refresh is requested alongside it.
 */
export function observeLocalQuery<T>(query: Query, listener: (value: T) => void, onError?: (error: unknown) => void): () => void {
    let active = true;
    let unsubscribe = function () {};
    let revision = -1;
    async function read() {
        await withCore(async (core) => {
            const snapshot = await core.queries.read<T>(query);
            if (active && snapshot.data !== null && snapshot.localRevision >= revision) {
                revision = snapshot.localRevision; listener(snapshot.data);
            }
        }).catch((error) => { if (active) onError?.(error); });
    }
    void withCore(async (core) => {
        if (!active) return;
        unsubscribe = core.subscribe(() => { void read(); });
        await read();
        await core.queries.requestRefresh(query);
    }).catch(() => undefined);
    return function () { active = false; unsubscribe(); };
}

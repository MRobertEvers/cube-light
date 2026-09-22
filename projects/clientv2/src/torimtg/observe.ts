import type { Query } from '@torimtg/core';
import { withCore } from './ui-api';

/** Subscribe before reading; each invalidation rereads through a Redux thunk. */
export function observeLocalQuery<T>(query: Query, listener: (value: T) => void): () => void {
    let active = true;
    let unsubscribe = function () {};
    let revision = -1;
    async function read() {
        await withCore(async (core) => {
            const snapshot = await core.queries.read<T>(query);
            if (active && snapshot.data !== null && snapshot.localRevision >= revision) {
                revision = snapshot.localRevision; listener(snapshot.data);
            }
        }).catch(() => undefined);
    }
    void withCore(async (core) => {
        if (!active) return;
        unsubscribe = core.subscribe(() => { void read(); });
        await read();
    });
    return function () { active = false; unsubscribe(); };
}

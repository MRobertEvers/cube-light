import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { withCore } from '../../torimtg/ui-api';
import type { Intent } from '../../torimtg/types';
import type { OfflineState } from '../../store/offline.state';
import styles from './offline-status.module.css';

export function OfflineStatus() {
    const state = useSelector((root: { offline: OfflineState }) => root.offline);
    const [online, setOnline] = useState(navigator.onLine);
    const [intents, setIntents] = useState<Intent[]>([]);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        function changed() { setOnline(navigator.onLine); }
        window.addEventListener('online', changed); window.addEventListener('offline', changed);
        return function () { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); };
    }, []);
    useEffect(() => { void withCore((core) => core.pending()).then(setIntents).catch(() => undefined); }, [state.revision]);
    async function resolve(operationId: string, choice: 'server' | 'mine') {
        try { await withCore((core) => core.commands.resolve(operationId, choice)); setError(null); }
        catch (error) { setError(error instanceof Error ? error.message : 'Could not resolve this edit.'); }
    }
    async function exportEdits() {
        const blob = await withCore((core) => core.exportPending());
        const url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'torimtg-unsynced-edits.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const label = !isSecureContext ? 'HTTPS required for sync' : state.status === 'auth-required' ? 'Sign in again to sync' : state.conflicts ? `${state.conflicts} edits need review` : state.pending ? `${state.pending} saved on this device` : !online ? 'Offline' : state.status === 'queued' || state.status === 'running' ? 'Refreshing saved data' : state.error ? 'Refresh unavailable' : state.lastValidatedAt ? 'Synced' : 'Preparing offline data';
    return <details className={styles.status}>
        <summary aria-live="polite">{label}</summary>
        <div className={styles.panel}>
            <p>{state.pending ? 'Your edits are saved locally and will sync when the server is available.' : 'This app reads and saves data on your device first.'}</p>
            {state.lastValidatedAt && <p>Last checked: {new Date(state.lastValidatedAt).toLocaleString()}</p>}
            {!isSecureContext && <p>Open the app over HTTPS or localhost to enable its synchronization worker.</p>}
            {(error || state.error) && <p role="alert">{error || state.error}</p>}
            <button type="button" onClick={() => { void withCore((core) => core.queries.requestRefresh()); }}>Retry sync</button>
            <button type="button" onClick={() => { void exportEdits(); }}>Export unsynced edits</button>
            <button type="button" onClick={() => { void navigator.storage?.persist().then((kept) => setError(kept ? 'Persistent storage enabled.' : 'The browser manages storage automatically. Synced data can be downloaded again.')); }}>Keep data on this device</button>
            {intents.filter((intent) => ['conflict', 'rejected'].includes(intent.status)).map((intent) => <div key={intent.operationId} className={styles.conflict}>
                <strong>{intent.command.type}</strong>
                <p>{intent.error}</p>
                <p>Resolving this edit also applies to later edits that depend on it.</p>
                <button type="button" onClick={() => { void resolve(intent.operationId, 'mine'); }}>Retry my edits against latest state</button>
                <button type="button" onClick={() => { void resolve(intent.operationId, 'server'); }}>Use server; discard these local edits</button>
            </div>)}
        </div>
    </details>;
}

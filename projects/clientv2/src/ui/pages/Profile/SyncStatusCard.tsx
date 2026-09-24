import React, { useEffect, useState } from 'react';
import type { PendingEdit } from '../../../domain/models/pending-edit';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { exportUnsyncedEdits, readPendingEdits, resolveEdit, retrySync } from '../../../redux/offline/offline.thunks';
import { selectOffline } from '../../../redux/offline/offline.selectors';
import styles from './profile.module.css';

/** Whether this device's edits have reached the server, with the controls to retry, export or resolve them. */
export function SyncStatusCard() {
	const state = useAppSelector(selectOffline);
	const dispatch = useAppDispatch();
	const [online, setOnline] = useState(navigator.onLine);
	const [intents, setIntents] = useState<PendingEdit[]>([]);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		function changed() { setOnline(navigator.onLine); }
		window.addEventListener('online', changed); window.addEventListener('offline', changed);
		return function () { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); };
	}, []);
	useEffect(() => { void dispatch(readPendingEdits()).then(setIntents).catch(() => undefined); }, [dispatch, state.revision]);
	async function resolve(operationId: string, choice: 'server' | 'mine') {
		try { await dispatch(resolveEdit(operationId, choice)); setError(null); }
		catch (error) { setError(error instanceof Error ? error.message : 'Could not resolve this edit.'); }
	}
	async function exportEdits() {
		const blob = await dispatch(exportUnsyncedEdits());
		const url = URL.createObjectURL(blob), link = document.createElement('a');
		link.href = url; link.download = 'torimtg-unsynced-edits.json'; link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
	const label = state.status === 'auth-required' ? 'Sign in again to sync' : state.conflicts ? `${state.conflicts} edits need review` : state.pending ? `${state.pending} saved on this device` : !online ? 'Offline' : state.status === 'queued' || state.status === 'running' ? 'Refreshing saved data' : state.error ? 'Refresh unavailable' : state.lastValidatedAt ? 'Synced' : 'Preparing offline data';
	const tone = state.status === 'auth-required' || state.conflicts || state.error ? 'off' : state.pending || !online || state.status === 'queued' || state.status === 'running' || !state.lastValidatedAt ? 'pending' : 'good';
	return <section className={`${styles.card} ${styles.device}`} aria-labelledby="sync-heading">
		<h2 id="sync-heading">Sync</h2>
		<p className={styles.intro}>{state.pending ? 'Your edits are saved locally and will sync when the server is available.' : 'This app reads and saves data on your device first.'}</p>
		<p className={styles.shellStatus} role="status" aria-live="polite">
			<span className={`${styles.shellDot} ${styles[tone]}`} aria-hidden="true" />
			<strong>{label}</strong>
		</p>
		{state.lastValidatedAt && <p className={styles.shellDetail}>Last checked: {new Date(state.lastValidatedAt).toLocaleString()}</p>}
		{(error || state.error) && <p className={styles.error} role="alert">{error || state.error}</p>}
		<div className={styles.syncActions}>
			<button type="button" onClick={() => { void dispatch(retrySync()); }}>Retry sync</button>
			<button type="button" onClick={() => { void exportEdits(); }}>Export unsynced edits</button>
			<button type="button" onClick={() => { void navigator.storage?.persist().then((kept) => setError(kept ? 'Persistent storage enabled.' : 'The browser manages storage automatically. Synced data can be downloaded again.')); }}>Keep data on this device</button>
		</div>
		{intents.filter((intent) => ['conflict', 'rejected'].includes(intent.status)).map((intent) => <div key={intent.operationId} className={styles.conflict}>
			<strong>{intent.command.type}</strong>
			<p>{intent.error}</p>
			<p>Resolving this edit also applies to later edits that depend on it.</p>
			<div className={styles.syncActions}>
				<button type="button" onClick={() => { void resolve(intent.operationId, 'mine'); }}>Retry my edits against latest state</button>
				<button type="button" onClick={() => { void resolve(intent.operationId, 'server'); }}>Use server; discard these local edits</button>
			</div>
		</div>)}
	</section>;
}

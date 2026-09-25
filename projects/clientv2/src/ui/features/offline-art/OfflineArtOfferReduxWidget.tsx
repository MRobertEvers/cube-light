import React, { useEffect, useState } from 'react';
import type { CardArtStatus } from '../../../domain/models/card-art';
import type { OfflineShellStatus } from '../../../domain/models/offline-shell';
import { installCardArt, markCardArtAsked, readCardArtStatus } from '../../../redux/card-art/card-art.thunks';
import { selectConnectivity } from '../../../redux/connectivity/connectivity.selectors';
import { watchOfflineShell } from '../../../redux/offline/offline.thunks';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import styles from './offline-art-offer.module.css';

function megabytes(bytes: number): string {
	return `${Math.round(bytes / 1e6)} MB`;
}

/**
 * Once the app is installed on a device (its service worker is active), asks one time
 * whether to download every card's art for offline use, and shows the download. Profile
 * installs, updates and removes it later.
 */
export function OfflineArtOfferReduxWidget() {
	const dispatch = useAppDispatch();
	const connectivity = useAppSelector(selectConnectivity);
	const [shell, setShell] = useState<OfflineShellStatus | null>(null);
	const [status, setStatus] = useState<CardArtStatus | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => dispatch(watchOfflineShell(setShell)), [dispatch]);
	useEffect(() => {
		if (shell !== 'installed' || connectivity !== 'online') return;
		let current = true;
		void dispatch(readCardArtStatus()).then(function (found) {
			if (current) setStatus(found);
		});
		return function () {
			current = false;
		};
	}, [dispatch, shell, connectivity]);

	const offered = status?.offered ?? null;
	const show = !dismissed && !!status && !!offered && !status.asked && !status.installed;
	if (!show || !offered) return null;

	async function download() {
		setError(null);
		setProgress(0);
		await dispatch(markCardArtAsked());
		try {
			await dispatch(
				installCardArt(function (received, total) {
					setProgress(total ? received / total : 0);
				})
			);
			setDismissed(true);
		} catch (failure) {
			setError(failure instanceof Error ? `${failure.message} You can try again from Profile.` : 'The download failed. You can try again from Profile.');
			setProgress(null);
		}
	}

	async function notNow() {
		await dispatch(markCardArtAsked());
		setDismissed(true);
	}

	const busy = progress !== null;
	return (
		<aside className={styles.offer} role="dialog" aria-labelledby="offline-art-offer-title">
			<h2 id="offline-art-offer-title">Card art for offline use?</h2>
			<p>
				Download art for all {offered.cards.toLocaleString()} cards ({megabytes(offered.bytes)}), so decks show their cards
				without a connection. You can change this later in Profile.
			</p>
			{busy && (
				<p className={styles.progress} role="status" aria-live="polite">
					<span className={styles.bar} aria-hidden="true">
						<span style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
					</span>
					Downloading… {Math.round((progress ?? 0) * 100)}%
				</p>
			)}
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
			<div className={styles.actions}>
				<button type="button" onClick={() => (error ? setDismissed(true) : void notNow())} disabled={busy}>
					{error ? 'Close' : 'Not now'}
				</button>
				{!error && (
					<button type="button" className={styles.primary} onClick={() => void download()} disabled={busy}>
						Download art
					</button>
				)}
			</div>
		</aside>
	);
}

import React, { useEffect, useState } from 'react';
import { cardArtUpdateAvailable, type CardArtStatus } from '../../../domain/models/card-art';
import { installCardArt, markCardArtAsked, readCardArtStatus, removeCardArt } from '../../../redux/card-art/card-art.thunks';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import styles from './profile.module.css';

function megabytes(bytes: number): string {
	return `${(bytes / 1e6).toFixed(0)} MB`;
}

/** Installs a small image of every card's art on this device, so decks show their art without the server. */
export function OfflineCardArtCard() {
	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<CardArtStatus | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let current = true;
		void dispatch(readCardArtStatus()).then(function (found) {
			if (current) setStatus(found);
		});
		return function () {
			current = false;
		};
	}, [dispatch]);

	async function install() {
		setError(null);
		setProgress(0);
		try {
			await dispatch(markCardArtAsked());
			await dispatch(
				installCardArt(function (received, total) {
					setProgress(total ? received / total : 0);
				})
			);
			setStatus(await dispatch(readCardArtStatus()));
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'The download failed.');
		} finally {
			setProgress(null);
		}
	}

	async function remove() {
		setError(null);
		await dispatch(removeCardArt());
		setStatus(await dispatch(readCardArtStatus()));
	}

	const installed = status?.installed ?? null;
	const offered = status?.offered ?? null;
	const update = status ? cardArtUpdateAvailable(status) : false;
	const busy = progress !== null;

	return (
		<section className={`${styles.card} ${styles.device}`} aria-labelledby="offline-art-heading">
			<h2 id="offline-art-heading">Offline card art</h2>
			<p className={styles.intro}>A small image of every card&rsquo;s art, so decks, banners and your profile picture show their art without the server.</p>
			{status && (
				<p className={styles.shellStatus} role="status" aria-live="polite">
					<span className={`${styles.shellDot} ${styles[installed ? (update ? 'pending' : 'good') : 'off']}`} aria-hidden="true" />
					<strong>{busy ? `Downloading… ${Math.round((progress ?? 0) * 100)}%` : installed ? (update ? 'Update available' : 'Installed') : 'Not installed'}</strong>
				</p>
			)}
			{installed && (
				<p className={styles.shellDetail}>
					Art for {installed.cards.toLocaleString()} cards, {megabytes(installed.bytes)}, installed {new Date(installed.installedAt).toLocaleString()}.
				</p>
			)}
			{offered && (!installed || update) && (
				<p className={styles.shellDetail}>
					{update ? 'Newer art' : 'Download'}: {offered.cards.toLocaleString()} cards, {megabytes(offered.bytes)}.
				</p>
			)}
			{status && !offered && !installed && <p className={styles.shellDetail}>Connect to the server to download it.</p>}
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
			<div className={styles.syncActions}>
				{offered && (!installed || update) && (
					<button type="button" disabled={busy} onClick={() => void install()}>
						{update ? 'Update card art' : 'Install card art'}
					</button>
				)}
				{installed && (
					<button type="button" disabled={busy} onClick={() => void remove()}>
						Remove card art
					</button>
				)}
			</div>
		</section>
	);
}

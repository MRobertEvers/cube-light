import React, { useEffect, useState } from 'react';
import { cardNamesUpdateAvailable, cardPackUpdateAvailable, type CardPackStatus, type PackCard } from '../../../domain/models/card-pack';
import { installCardPack, lookupPackCard, readCardPackStatus, removeCardPack } from '../../../redux/card-pack/card-pack.thunks';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { PackCardText } from './PackCardText';
import styles from './profile.module.css';

function megabytes(bytes: number): string {
	return `${(bytes / 1e6).toFixed(1)} MB`;
}

type Lookup = { name: string; card: PackCard | null };

/**
 * Installs every card's text on this device (name, mana cost, type line, rules text and
 * stats, but no images or printings), so card text reads with no server, and the
 * card-name index name search reads. Either can have an update. A lookup field reads the
 * text back.
 */
export function OfflineCardDataCard() {
	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<CardPackStatus | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState('');
	const [lookup, setLookup] = useState<Lookup | null>(null);

	useEffect(() => {
		let current = true;
		void dispatch(readCardPackStatus()).then(function (found) {
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
			await dispatch(
				installCardPack(function (received, total) {
					setProgress(total ? received / total : 0);
				})
			);
			setStatus(await dispatch(readCardPackStatus()));
		} catch (failure) {
			setError(failure instanceof Error ? failure.message : 'The download failed.');
		} finally {
			setProgress(null);
		}
	}

	async function remove() {
		setError(null);
		await dispatch(removeCardPack());
		setLookup(null);
		setStatus(await dispatch(readCardPackStatus()));
	}

	async function find(event: React.FormEvent) {
		event.preventDefault();
		const name = query.trim();
		if (!name) return;
		setLookup({ name, card: await dispatch(lookupPackCard(name)) });
	}

	const installed = status?.installed ?? null;
	const offered = status?.offered ?? null;
	const packUpdate = status ? cardPackUpdateAvailable(status) : false;
	const namesUpdate = status ? cardNamesUpdateAvailable(status) : false;
	const update = packUpdate || namesUpdate;
	const namesOffered = status?.namesOffered ?? null;
	const busy = progress !== null;

	return (
		<section className={`${styles.card} ${styles.device}`} aria-labelledby="offline-cards-heading">
			<h2 id="offline-cards-heading">Offline card data</h2>
			<p className={styles.intro}>
				Every card&rsquo;s name, mana cost, type line, rules text and stats, so card text reads without the server. Images and printings still need it.
			</p>
			{status && (
				<p className={styles.shellStatus} role="status" aria-live="polite">
					<span className={`${styles.shellDot} ${styles[installed ? (update ? 'pending' : 'good') : 'off']}`} aria-hidden="true" />
					<strong>{busy ? `Downloading… ${Math.round((progress ?? 0) * 100)}%` : installed ? (update ? 'Update available' : 'Installed') : 'Not installed'}</strong>
				</p>
			)}
			{installed && (
				<p className={styles.shellDetail}>
					{installed.cards.toLocaleString()} cards from card data of {installed.date}, installed {new Date(installed.installedAt).toLocaleString()}.
				</p>
			)}
			{offered && (!installed || packUpdate) && (
				<p className={styles.shellDetail}>
					{packUpdate ? 'Newer card data' : 'Download'}: {offered.cards.toLocaleString()} cards from {offered.date}, {megabytes(offered.bytes)}.
				</p>
			)}
			{namesOffered && namesUpdate && (
				<p className={styles.shellDetail}>
					Newer card names for search: {namesOffered.names.toLocaleString()} names from {namesOffered.date}, {megabytes(namesOffered.bytes)}.
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
						{update ? 'Update card data' : 'Install card data'}
					</button>
				)}
				{installed && (
					<button type="button" disabled={busy} onClick={() => void remove()}>
						Remove card data
					</button>
				)}
			</div>
			{installed && (
				<form className={styles.packLookup} onSubmit={(event) => void find(event)}>
					<label htmlFor="offline-card-lookup">Look up a card</label>
					<div>
						<input
							id="offline-card-lookup"
							type="search"
							value={query}
							placeholder="Search cards"
							autoComplete="off"
							onChange={(event) => setQuery(event.target.value)}
						/>
						<button type="submit">Look up</button>
					</div>
				</form>
			)}
			{lookup && (lookup.card ? <PackCardText card={lookup.card} /> : <p className={styles.shellDetail}>No card named &ldquo;{lookup.name}&rdquo;.</p>)}
		</section>
	);
}

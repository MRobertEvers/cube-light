import React, { useEffect, useState } from 'react';
import type { OfflineShellStatus } from '../../../domain/models/offline-shell';
import type { BuildInfo, ShellMode } from '../../../domain/models/build-info';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { readRunningBuild, readShellMode, setShellMode, watchOfflineShell } from '../../../redux/offline/offline.thunks';
import styles from './profile.module.css';

const LABELS: Record<OfflineShellStatus, { title: string; detail: string; tone: 'good' | 'pending' | 'off' }> = {
	installed: {
		title: 'Installed',
		detail: 'The service worker is active, so the app can start on this device without a network.',
		tone: 'good'
	},
	installing: {
		title: 'Installing…',
		detail: 'The service worker is saving the app on this device.',
		tone: 'pending'
	},
	'not-installed': {
		title: 'Not installed',
		detail: 'The service worker could not register, often because of an untrusted certificate or private browsing. The app needs the network to load.',
		tone: 'off'
	},
	insecure: {
		title: 'Not available',
		detail: 'This address is not a secure (HTTPS) origin, so the browser does not allow a service worker. The app needs the network to load.',
		tone: 'off'
	},
	unsupported: {
		title: 'Not supported',
		detail: 'This browser does not support service workers. The app needs the network to load.',
		tone: 'off'
	}
};

/** A release by its name and build time; development by its commit and commit time. */
function describeBuild(build: BuildInfo): { title: string; detail: string } {
	const time = build.time ? new Date(build.time).toLocaleString() : 'unknown time';
	if (build.channel === 'release') return { title: `Release ${build.name}`, detail: `Released ${time}` };
	const commit = build.commit || 'unknown commit';
	return {
		title: 'Development',
		detail: `Commit ${commit}, ${time}${build.modified ? ', with uncommitted changes' : ''}`
	};
}

/**
 * Which build is running, whether the service worker that lets the app start offline is
 * installed on this device, and whether it loads the release or the development server.
 */
export function OfflineShellStatusCard() {
	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<OfflineShellStatus | null>(null);
	const [mode, setMode] = useState<ShellMode | null>(null);
	const [build] = useState(() => dispatch(readRunningBuild()));

	useEffect(() => dispatch(watchOfflineShell(setStatus)), [dispatch]);
	useEffect(() => {
		let current = true;
		void dispatch(readShellMode()).then(function (found) {
			if (current) setMode(found);
		});
		return function () {
			current = false;
		};
	}, [dispatch]);

	const label = status ? LABELS[status] : null;
	const running = describeBuild(build);
	return (
		<section className={`${styles.card} ${styles.device}`} aria-labelledby="offline-shell-heading">
			<h2 id="offline-shell-heading">App version</h2>
			<p className={styles.shellStatus}>
				<span className={`${styles.shellDot} ${styles[build.channel === 'release' ? 'good' : 'pending']}`} aria-hidden="true" />
				<strong>{running.title}</strong>
			</p>
			<p className={styles.shellDetail}>{running.detail}</p>
			{status === 'installed' && mode && (
				<label className={styles.shellMode}>
					<input
						type="checkbox"
						checked={mode === 'development'}
						onChange={function (event) {
							const next: ShellMode = event.target.checked ? 'development' : 'release';
							setMode(next);
							void dispatch(setShellMode(next));
						}}
					/>
					<span>
						<strong>Load from the development server</strong>
						<span className={styles.shellDetail}>Uses the release whenever the development server cannot be reached.</span>
					</span>
				</label>
			)}
			<h3 className={styles.shellHeading}>Offline start</h3>
			<p className={styles.intro}>Whether this device can open the app with no network.</p>
			{label && (
				<p className={styles.shellStatus} role="status">
					<span className={`${styles.shellDot} ${styles[label.tone]}`} aria-hidden="true" />
					<strong>Service worker: {label.title}</strong>
				</p>
			)}
			{label && <p className={styles.shellDetail}>{label.detail}</p>}
		</section>
	);
}

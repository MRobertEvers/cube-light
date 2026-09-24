import React, { useEffect, useState } from 'react';
import type { OfflineShellStatus } from '../../../domain/models/offline-shell';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { watchOfflineShell } from '../../../redux/offline/offline.thunks';
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

/** Whether the service worker that lets the app start offline is installed on this device. */
export function OfflineShellStatusCard() {
	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<OfflineShellStatus | null>(null);

	useEffect(() => dispatch(watchOfflineShell(setStatus)), [dispatch]);

	const label = status ? LABELS[status] : null;
	return (
		<section className={`${styles.card} ${styles.device}`} aria-labelledby="offline-shell-heading">
			<h2 id="offline-shell-heading">Offline start</h2>
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

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Page } from '../../components/Page/Page';
import { NextPage } from '../../components/Page/NextPage';
import {
	ImageScanContent,
	statusText,
	totalAdded
} from 'src/components/ImageCardImport/DeckImageScanCard';
import { useImageImportQueue } from 'src/utils/use-image-import-queue';
import styles from 'src/components/ImageCardImport/deck-image-scan-card.module.css';

/** Intermediate step after creating a deck from an image: watch the scan, then continue to the deck. */
export function DeckImageScanPage(props: { deckId: string; taskId: string }) {
	const { deckId, taskId } = props;
	const navigate = useNavigate();
	const task = useImageImportQueue().find(
		(item) => item.id === taskId && item.deckId === deckId
	);

	// Scans live in memory, so a reload or stale link has nothing to show.
	if (!task) return <Navigate to={`/deck/${deckId}`} replace />;

	const actions = (
		<div className={styles.pageActions}>
			<button
				type="button"
				className={styles.primary}
				onClick={() => navigate(`/deck/${deckId}`)}
			>
				{task.status === 'completed' ? 'Open deck' : 'Continue to deck'}
			</button>
		</div>
	);

	return (
		<NextPage title="Image scan">
			<Page>
				<main className={styles.page}>
					<header className={styles.pageHeader}>
						<div>
							<h1>Image scan</h1>
							<p>
								{task.fileName} · {statusText(task)} ·{' '}
								{totalAdded(task)} cards added
							</p>
						</div>
						{actions}
					</header>
					<ImageScanContent task={task} />
					<footer className={styles.pageFooter}>{actions}</footer>
				</main>
			</Page>
		</NextPage>
	);
}

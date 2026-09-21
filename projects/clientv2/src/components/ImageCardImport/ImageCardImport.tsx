import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchAPICreateDeck } from 'src/api/fetch-api-create-deck';
import { imageImportQueue } from 'src/utils/image-import-queue';
import styles from './image-card-import.module.css';

type Props = {
	mode: 'create' | 'add';
	deckId?: string;
	onClose: () => void;
	onComplete: (deckId: string, taskId?: string) => void;
};

export function ImageCardImport(props: Props) {
	const { mode, deckId, onClose, onComplete } = props;
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [deckName, setDeckName] = useState('');
	const [isStarting, setIsStarting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);

	useEffect(
		() => () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		},
		[previewUrl]
	);
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && !isStarting) onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [isStarting, onClose]);

	const start = async () => {
		if (!file || isStarting || (mode === 'create' && !deckName.trim()))
			return;
		setIsStarting(true);
		setError(null);
		try {
			let targetDeckId = deckId ?? createdDeckId;
			if (!targetDeckId) {
				const created = await fetchAPICreateDeck(deckName.trim());
				targetDeckId = String(created.deckId);
				setCreatedDeckId(targetDeckId);
			}
			const taskId = imageImportQueue.enqueue(targetDeckId, file);
			onComplete(targetDeckId, taskId);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Could not start the image scan'
			);
			setIsStarting(false);
		}
	};

	return createPortal(
		<div className={styles.backdrop}>
			<section
				className={styles.panel}
				role="dialog"
				aria-modal="true"
				aria-labelledby="image-import-title"
			>
				<header className={styles.header}>
					<div>
						<h2 id="image-import-title">
							{mode === 'create'
								? 'Create a deck from image'
								: 'Add cards in image'}
						</h2>
						<p>
							{mode === 'create'
								? 'You can watch cards being found, or continue to the deck while scanning runs in the background.'
								: 'The deck opens right away. Card scanning continues in the background.'}
						</p>
					</div>
					<button
						type="button"
						className={styles.close}
						onClick={onClose}
						disabled={isStarting}
						aria-label="Close image import"
					>
						×
					</button>
				</header>
				<div className={styles.body}>
					<div className={styles.controls}>
						{mode === 'create' && (
							<label>
								Deck name
								<input
									autoFocus
									value={deckName}
									onChange={(event) =>
										setDeckName(event.target.value)
									}
									maxLength={1024}
									placeholder="Give your deck a name"
									disabled={isStarting}
								/>
							</label>
						)}
						<label>
							Card photo
							<input
								type="file"
								accept="image/*"
								disabled={isStarting}
								onChange={(event) => {
									const selected =
										event.target.files?.[0] ?? null;
									setFile(selected);
									setPreviewUrl(
										selected
											? URL.createObjectURL(selected)
											: null
									);
									setError(null);
								}}
							/>
						</label>
					</div>
					{previewUrl && (
						<div className={styles.preview}>
							<img
								src={previewUrl}
								alt="Card photo selected for background scan"
							/>
						</div>
					)}
					{error && (
						<p className={styles.error} role="alert">
							{error}
						</p>
					)}
					{createdDeckId && error && (
						<p>
							The deck was created. Retry scanning or open the
							deck.
						</p>
					)}
				</div>
				<footer className={styles.footer}>
					{createdDeckId && error && (
						<button
							type="button"
							onClick={() => onComplete(createdDeckId)}
						>
							Open deck
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						disabled={isStarting}
					>
						Cancel
					</button>
					<button
						type="button"
						className={styles.primary}
						onClick={() => {
							void start();
						}}
						disabled={
							!file ||
							isStarting ||
							(mode === 'create' && !deckName.trim())
						}
					>
						{isStarting
							? 'Starting…'
							: mode === 'create'
								? 'Create deck and scan'
								: 'Start image scan'}
					</button>
				</footer>
			</section>
		</div>,
		document.body
	);
}

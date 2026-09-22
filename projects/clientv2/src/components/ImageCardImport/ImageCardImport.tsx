import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchAPICreateDeck } from 'src/api/fetch-api-create-deck';
import { imageImportQueue } from 'src/utils/image-import-queue';
import { isMobileDevice } from 'src/utils/is-mobile-device';
import { workQueue } from 'src/utils/work-queue';
import { HeaderBackButton } from 'src/components/BackLink/BackLink';
import {
	HeaderBackSlot,
	HeaderBackSlotContext
} from 'src/components/Header/HeaderBackSlot';
import { DeckControlIcon } from 'src/views/Deck/DeckControlIcons';
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
	const [isDragging, setIsDragging] = useState(false);
	const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
	// State, not a ref, so the back button portals in once the slot mounts.
	const [backSlot, setBackSlot] = useState<HTMLElement | null>(null);
	// Mobile scans require an explicit opt-in because of data and energy use.
	const [isMobile] = useState(isMobileDevice);
	const [scanHere, setScanHere] = useState(false);
	const deferToDesktop = isMobile && !scanHere;

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

	const selectFile = (selected: File | null) => {
		if (!selected) return;
		setFile(selected);
		setPreviewUrl(URL.createObjectURL(selected));
		setError(null);
	};

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
			if (deferToDesktop) {
				await workQueue.queueCardImage(targetDeckId, file);
				onComplete(targetDeckId);
				return;
			}
			const taskId = imageImportQueue.enqueue(targetDeckId, file);
			onComplete(targetDeckId, taskId);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: deferToDesktop
						? 'Could not queue the photo'
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
					<HeaderBackSlot ref={setBackSlot} />
					<HeaderBackSlotContext.Provider value={backSlot}>
						{/* Phones fill the screen and close from here, so × and Cancel hide. */}
						<HeaderBackButton
							label="Close image import"
							onClick={() => {
								if (!isStarting) onClose();
							}}
						/>
					</HeaderBackSlotContext.Provider>
					<div className={styles.title}>
						<h2 id="image-import-title">
							{mode === 'create'
								? 'Create a deck from image'
								: 'Add cards in image'}
						</h2>
						<p>
							{deferToDesktop
								? 'Your photo is saved and scanned the next time you open Cube Light on a computer.'
								: mode === 'create'
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
						<div className={styles.photoField}>
							<span id="image-import-photo-label">
								Card photo
							</span>
							{/* No `capture`, so phones offer camera, library and files. */}
							<label
								className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${previewUrl ? styles.hasPreview : ''}`}
								onDragOver={(event) => {
									event.preventDefault();
									if (!isStarting) setIsDragging(true);
								}}
								onDragLeave={() => setIsDragging(false)}
								onDrop={(event) => {
									event.preventDefault();
									setIsDragging(false);
									if (isStarting) return;
									const dropped = event.dataTransfer.files[0];
									if (dropped?.type.startsWith('image/'))
										selectFile(dropped);
								}}
							>
								<input
									className={styles.fileInput}
									type="file"
									accept="image/*"
									aria-labelledby="image-import-photo-label"
									disabled={isStarting}
									onChange={(event) =>
										selectFile(
											event.target.files?.[0] ?? null
										)
									}
								/>
								{previewUrl ? (
									<>
										<img
											src={previewUrl}
											alt="Card photo selected for background scan"
										/>
										<span className={styles.change}>
											<DeckControlIcon
												name="camera"
												size={16}
											/>
											Change photo
										</span>
									</>
								) : (
									<span className={styles.prompt}>
										<DeckControlIcon
											name="camera"
											size={44}
										/>
										<strong>
											Add a photo of your cards
										</strong>
										<span>Take a photo or choose one</span>
									</span>
								)}
							</label>
						</div>
						{isMobile && (
							<label className={styles.scanHere}>
								<input
									type="checkbox"
									checked={scanHere}
									onChange={(event) =>
										setScanHere(event.target.checked)
									}
									disabled={isStarting}
									aria-describedby="image-import-mobile-warning"
								/>
								<span>
									Scan on this device instead
									<small id="image-import-mobile-warning">
										Scanning is data and energy intensive: it
										downloads large recognition models and can
										drain your battery. Wi-Fi and a charger are
										recommended.
									</small>
								</span>
							</label>
						)}
					</div>
					{error && (
						<p className={styles.error} role="alert">
							{error}
						</p>
					)}
					{createdDeckId && error && (
						<p>The deck was created. Try again or open the deck.</p>
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
						className={styles.cancel}
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
							? deferToDesktop
								? 'Uploading…'
								: 'Starting…'
							: deferToDesktop
								? mode === 'create'
									? 'Create deck and queue scan'
									: 'Queue for desktop'
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

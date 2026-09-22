import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { fetchAPICardNames } from 'src/api/fetch-api-card-names';
import {
	type ImageScanTask,
	imageImportQueue
} from 'src/utils/image-import-queue';
import { useImageImportQueue } from 'src/utils/use-image-import-queue';
import { useWorkQueue } from 'src/utils/work-queue';
import { workProgress, workStatusText } from 'src/utils/work-status';
import { type ImageRegion } from 'src/utils/card-image-ocr';
import { LogoInkwellPulse } from 'src/components/LogoInkwellPulse/LogoInkwellPulse';
import modalStyles from './image-card-import.module.css';
import styles from './deck-image-scan-card.module.css';

type CandidateGroup = {
	name: string;
	count: number;
	boxes: ImageRegion[];
	score: number;
};

function groupCandidates(task: ImageScanTask): CandidateGroup[] {
	const groups = new Map<string, CandidateGroup>();
	for (const candidate of task.candidates) {
		const item = groups.get(candidate.name);
		if (item) {
			item.count++;
			item.boxes.push(candidate.box);
			item.score = Math.max(item.score, candidate.score);
		} else {
			groups.set(candidate.name, {
				name: candidate.name,
				count: 1,
				boxes: [candidate.box],
				score: candidate.score
			});
		}
	}
	return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function statusText(task: ImageScanTask): string {
	switch (task.status) {
		case 'queued':
			return 'Waiting in scan queue';
		case 'loading':
			return task.phaseLabel || 'Preparing scan';
		case 'scanning':
			return task.phaseLabel
				? `${task.phaseLabel} · ${task.completed}%`
				: `${task.completed} of ${task.total} regions scanned`;
		case 'adding':
			return 'Adding identified cards';
		case 'completed':
			return 'Image scan complete';
		case 'error':
			return 'Image scan needs attention';
	}
}

export function totalAdded(task: ImageScanTask): number {
	return Object.values(task.addedCounts).reduce(
		(total, count) => total + count,
		0
	);
}

/** Live scan preview, extracted-card list and manual entry, shared by the scan modal and scan page. */
export function ImageScanContent(props: { task: ImageScanTask }) {
	const { task } = props;
	const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
	const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
	const previewRef = useRef<HTMLDivElement>(null);
	const [hoverBoxes, setHoverBoxes] = useState<ImageRegion[]>([]);
	const [zoomName, setZoomName] = useState<string | null>(null);
	const [zoomIndex, setZoomIndex] = useState(0);
	const [manualName, setManualName] = useState('');
	const [manualCount, setManualCount] = useState(1);
	const [names, setNames] = useState<string[]>([]);
	const [adding, setAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const groups = useMemo(() => groupCandidates(task), [task.candidates]);
	const zoomGroup = zoomName
		? groups.find((group) => group.name === zoomName)
		: undefined;
	const zoomBox = zoomGroup?.boxes[zoomIndex % zoomGroup.boxes.length];
	// A user inspecting an extracted card takes visual precedence over the live scan outline.
	const selectedBoxes =
		hoverBoxes.length > 0
			? hoverBoxes
			: zoomBox
				? [zoomBox]
				: task.region
					? [task.region]
					: [];
	const suggestions = useMemo(() => {
		const query = manualName.trim().toLocaleLowerCase();
		return query.length < 2
			? []
			: names
					.filter((name) => name.toLocaleLowerCase().includes(query))
					.slice(0, 12);
	}, [manualName, names]);
	const exactManualName = names.find(
		(name) =>
			name.toLocaleLowerCase() === manualName.trim().toLocaleLowerCase()
	);
	const markerStyle = useMemo<React.CSSProperties | null>(() => {
		if (
			!task.region ||
			!imageSize.width ||
			!imageSize.height ||
			!previewSize.width ||
			!previewSize.height
		)
			return null;
		const scale = Math.min(
			previewSize.width / imageSize.width,
			previewSize.height / imageSize.height
		);
		const imageLeft = (previewSize.width - imageSize.width * scale) / 2;
		const imageTop = (previewSize.height - imageSize.height * scale) / 2;
		return {
			position: 'absolute',
			left: imageLeft + (task.region.x + task.region.width / 2) * scale,
			top: imageTop + (task.region.y + task.region.height / 2) * scale,
			transform: 'translate(-50%, -50%)',
			zIndex: 2
		};
	}, [task.region, imageSize, previewSize]);
	const zoomStyle = useMemo<React.CSSProperties | null>(() => {
		if (
			!zoomBox ||
			!imageSize.width ||
			!imageSize.height ||
			!previewSize.width ||
			!previewSize.height
		)
			return null;
		const width = Math.min(300, Math.max(210, previewSize.width * 0.44));
		const height = Math.min(145, Math.max(105, previewSize.height * 0.38));
		const aspect = width / height;
		let cropWidth = Math.max(zoomBox.width * 1.5, imageSize.width * 0.1);
		let cropHeight = cropWidth / aspect;
		const minimumHeight = Math.max(
			zoomBox.height * 5,
			imageSize.height * 0.08
		);
		if (cropHeight < minimumHeight) {
			cropHeight = minimumHeight;
			cropWidth = cropHeight * aspect;
		}
		cropWidth = Math.min(cropWidth, imageSize.width);
		cropHeight = Math.min(cropHeight, imageSize.height);
		const cropX = Math.max(
			0,
			Math.min(
				imageSize.width - cropWidth,
				zoomBox.x + zoomBox.width / 2 - cropWidth / 2
			)
		);
		const cropY = Math.max(
			0,
			Math.min(
				imageSize.height - cropHeight,
				zoomBox.y + zoomBox.height / 2 - cropHeight / 2
			)
		);
		const scale = Math.min(width / cropWidth, height / cropHeight);
		return {
			width,
			height,
			backgroundImage: `url("${task.imageUrl}")`,
			backgroundRepeat: 'no-repeat',
			backgroundSize: `${imageSize.width * scale}px ${imageSize.height * scale}px`,
			backgroundPosition: `${-cropX * scale}px ${-cropY * scale}px`
		};
	}, [zoomBox, imageSize, previewSize, task.imageUrl]);

	useEffect(() => {
		const preview = previewRef.current;
		if (!preview) return;
		const observer = new ResizeObserver((values) => {
			const [entry] = values;

			setPreviewSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height
			});
		});
		observer.observe(preview);
		return function () {
			return observer.disconnect();
		};
	}, []);

	useEffect(() => {
		let active = true;
		void fetchAPICardNames()
			.then((result) => {
				if (active) setNames(result);
			})
			.catch(() => {
				if (active)
					setError('Could not load card names for manual entry');
			});
		return function () {
			active = false;
		};
	}, []);

	async function add(name: string, count: number): Promise<boolean> {
		setAdding(true);
		setError(null);
		try {
			await imageImportQueue.addCandidate(task.id, name, count);
			return true;
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Could not add this card'
			);
			return false;
		} finally {
			setAdding(false);
		}
	}

	return (
		<>
			<div className={modalStyles.progress}>
				<progress
					value={
						task.status === 'queued' ||
						task.status === 'loading' ||
						task.progressIndeterminate
							? undefined
							: task.completed
					}
					max={task.total || 1}
				/>
				<p role="status">
					{statusText(task)}. {task.candidates.length} name candidates
					found.
				</p>
			</div>
			<div
				className={`${modalStyles.preview} ${styles.stickyPreview}`}
				ref={previewRef}
				data-image-scan-preview
			>
				<img
					src={task.imageUrl}
					alt="Card photo being analyzed"
					onLoad={(event) =>
						setImageSize({
							width: event.currentTarget.naturalWidth,
							height: event.currentTarget.naturalHeight
						})
					}
				/>
				{selectedBoxes.length > 0 && imageSize.width > 0 && (
					<svg
						className={modalStyles.overlay}
						viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
						preserveAspectRatio="xMidYMid meet"
						aria-hidden="true"
					>
						{selectedBoxes.map((box, index) => (
							<rect
								key={index}
								x={box.x}
								y={box.y}
								width={box.width}
								height={box.height}
								rx={Math.max(16, imageSize.width * 0.012)}
							/>
						))}
					</svg>
				)}
				{markerStyle && (
					<LogoInkwellPulse size={38} style={markerStyle} />
				)}
				{zoomStyle && zoomGroup && (
					<div
						className={styles.zoomInset}
						style={zoomStyle}
						role="region"
						aria-label={`Zoomed location for ${zoomGroup.name}`}
					>
						<div className={styles.zoomBar}>
							<span>
								{zoomGroup.name}
								{zoomGroup.boxes.length > 1
									? ` · ${(zoomIndex % zoomGroup.boxes.length) + 1}/${zoomGroup.boxes.length}`
									: ''}
							</span>
							<span className={styles.zoomActions}>
								{zoomGroup.boxes.length > 1 && (
									<>
										<button
											type="button"
											onClick={() =>
												setZoomIndex(
													(zoomIndex -
														1 +
														zoomGroup.boxes
															.length) %
														zoomGroup.boxes.length
												)
											}
											aria-label={`Previous ${zoomGroup.name} location`}
										>
											‹
										</button>
										<button
											type="button"
											onClick={() =>
												setZoomIndex(
													(zoomIndex + 1) %
														zoomGroup.boxes.length
												)
											}
											aria-label={`Next ${zoomGroup.name} location`}
										>
											›
										</button>
									</>
								)}
								<button
									type="button"
									onClick={() => setZoomName(null)}
									aria-label="Close zoomed location"
								>
									×
								</button>
							</span>
						</div>
					</div>
				)}
			</div>
			{task.error && (
				<p className={modalStyles.error} role="alert">
					{task.error}
				</p>
			)}
			<h3 className={styles.sectionTitle}>
				Cards extracted so far ({task.candidates.length})
			</h3>
			<p className={styles.help}>
				This list updates while OCR runs. Hover a card to outline every
				match, or click its name for a zoomed view.{' '}
				{task.workId
					? 'Names resolved to the card index are added together when the scan finishes.'
					: 'Names resolved to the card index are added automatically.'}
			</p>
			<div className={styles.candidates}>
				{groups.map((group) => {
					const added = task.addedCounts[group.name] ?? 0;
					const planned = task.plannedCounts[group.name] ?? 0;
					// Queued scans add their matches at the end, so nothing is pending until then.
					const pending =
						task.workId && task.status !== 'completed'
							? 0
							: Math.max(0, group.count - planned);
					return (
						<div
							className={`${styles.candidate} ${zoomName === group.name ? styles.candidateSelected : ''}`}
							key={group.name}
							onMouseEnter={() => setHoverBoxes(group.boxes)}
							onMouseLeave={() => setHoverBoxes([])}
						>
							<div>
								<button
									type="button"
									className={styles.nameButton}
									onFocus={() => setHoverBoxes(group.boxes)}
									onBlur={() => setHoverBoxes([])}
									onClick={() => {
										setZoomName(group.name);
										setZoomIndex(0);
									}}
								>
									{group.name}
								</button>
								<small>
									{group.count} seen · {added} added
									{planned > added
										? ` · ${planned - added} adding`
										: ''}{' '}
									· {Math.round(group.score)}/100 similarity
								</small>
							</div>
							{pending > 0 && (
								<button
									type="button"
									disabled={adding || !!task.error}
									onClick={() => {
										void add(group.name, pending);
									}}
								>
									Add {pending}
								</button>
							)}
						</div>
					);
				})}
				{groups.length === 0 && <p>No names detected yet.</p>}
			</div>
			<div className={styles.manual}>
				<label>
					Missed card name
					<input
						value={manualName}
						list="scan-card-names"
						onChange={(event) => setManualName(event.target.value)}
						placeholder="Search card name"
					/>
				</label>
				<datalist id="scan-card-names">
					{suggestions.map((name) => (
						<option key={name} value={name} />
					))}
				</datalist>
				<label>
					Count
					<input
						type="number"
						min={1}
						max={999}
						value={manualCount}
						onChange={(event) =>
							setManualCount(Number(event.target.value))
						}
					/>
				</label>
				<button
					type="button"
					disabled={
						!exactManualName ||
						!Number.isInteger(manualCount) ||
						manualCount < 1 ||
						adding ||
						!!task.error
					}
					onClick={() => {
						if (!exactManualName) return;
						void add(exactManualName, manualCount).then(
							(success) => {
								if (success) {
									setManualName('');
									setManualCount(1);
								}
							}
						);
					}}
				>
					Add card
				</button>
			</div>
			{error && (
				<p className={modalStyles.error} role="alert">
					{error}
				</p>
			)}
		</>
	);
}

function ImageScanDetails(props: { task: ImageScanTask; onClose: () => void }) {
	const { task, onClose } = props;

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') onClose();
		}
		window.addEventListener('keydown', onKeyDown);
		return function () {
			return window.removeEventListener('keydown', onKeyDown);
		};
	}, [onClose]);

	return createPortal(
		<div
			className={`${modalStyles.backdrop} ${modalStyles.fullscreenMobile}`}
		>
			<section
				className={modalStyles.panel}
				role="dialog"
				aria-modal="true"
				aria-labelledby="scan-details-title"
			>
				<header className={modalStyles.header}>
					<div>
						<h2 id="scan-details-title">Image scan</h2>
						<p>
							{task.fileName} · {statusText(task)} ·{' '}
							{totalAdded(task)} cards added
						</p>
					</div>
					<button
						type="button"
						className={modalStyles.close}
						onClick={onClose}
						aria-label="Close scan details"
					>
						×
					</button>
				</header>
				<div className={`${modalStyles.body} ${styles.scanBody}`}>
					<ImageScanContent task={task} />
				</div>
				<footer className={modalStyles.footer}>
					{(task.status === 'completed' ||
						task.status === 'error') && (
						<button
							type="button"
							onClick={() => {
								imageImportQueue.dismiss(task.id);
								onClose();
							}}
						>
							Dismiss scan
						</button>
					)}
					<button type="button" onClick={onClose}>
						Close
					</button>
				</footer>
			</section>
		</div>,
		document.body
	);
}

export function DeckImageScanCard(props: { deckId: string }) {
	const { deckId } = props;
	const tasks = useImageImportQueue().filter(
		(task) => task.deckId === deckId
	);
	// Photos queued from a phone that aren't being scanned in this tab.
	const queued = (useWorkQueue().items ?? []).filter(
		(item) =>
			item.deck?.deckId === deckId &&
			item.status !== 'completed' &&
			!tasks.some((task) => task.workId === item.workId)
	);
	const [openId, setOpenId] = useState<string | null>(null);
	const openTask = tasks.find((task) => task.id === openId);
	if (tasks.length === 0 && queued.length === 0) return null;
	return (
		<div className={styles.list}>
			{queued.map((item) => {
				const progress = workProgress(item);
				return (
					<Link className={styles.card} to="/queue" key={item.workId}>
						<span className={styles.cardTitle}>
							<LogoInkwellPulse
								size={26}
								active={item.status === 'running'}
							/>{' '}
							{item.status === 'failed'
								? 'Queued photo scan'
								: 'Photo queued for a computer'}
						</span>
						<span className={styles.cardStatus}>
							{workStatusText(item)}
						</span>
						{progress !== null && (
							<progress value={progress} max={1} />
						)}
						<span className={styles.cardFoot}>
							{item.status === 'pending'
								? 'Cards are added when Cube Light next opens on a computer'
								: 'Open the queue for details'}
						</span>
					</Link>
				);
			})}
			{tasks.map((task) => (
				<button
					className={styles.card}
					type="button"
					key={task.id}
					onClick={() => setOpenId(task.id)}
				>
					<span className={styles.cardTitle}>
						<LogoInkwellPulse
							size={26}
							active={
								task.status !== 'completed' &&
								task.status !== 'error'
							}
						/>{' '}
						Image scan
					</span>
					<span className={styles.cardStatus}>
						{statusText(task)}
					</span>
					<span className={styles.cardExtracted}>
						{task.candidates.length} card
						{task.candidates.length === 1 ? '' : 's'} extracted ·{' '}
						{totalAdded(task)} added
					</span>
					{task.total > 0 && (
						<progress
							aria-label={task.phaseLabel || 'Scan progress'}
							value={
								task.progressIndeterminate
									? undefined
									: task.completed
							}
							max={task.total}
						/>
					)}
					<span className={styles.cardFoot}>
						Click to inspect extracted cards
					</span>
				</button>
			))}
			{openTask && (
				<ImageScanDetails
					task={openTask}
					onClose={() => setOpenId(null)}
				/>
			)}
		</div>
	);
}

import React, { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { WorkItem } from 'src/domain/models/work';
import { Page } from 'src/ui/kit/components/Page/Page';
import { NextPage } from 'src/ui/kit/components/Page/NextPage';
import { LogoInkwellPulse } from 'src/ui/kit/components/LogoInkwellPulse/LogoInkwellPulse';
import { statusText } from 'src/ui/kit/components/ImageCardImport/DeckImageScanCard';
import type { ImageScanTask } from 'src/domain/scans/image-scan-task';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { dismissScan, removeWork, retryWork, runQueuedScan, scansAreSlowHere } from 'src/redux/scans/scans.thunks';
import { useImageImportQueue } from 'src/ui/kit/utils/use-image-import-queue';
import { useWorkQueue } from 'src/ui/kit/utils/use-work-queue';
import { isOpenWork } from 'src/domain/models/work';
import {
	isScanActive,
	timeAgo,
	workProgress,
	workStatusText
} from 'src/ui/kit/utils/work-status';
import styles from './queue.module.css';

type RowProps = {
	imageUrl: string;
	title: React.ReactNode;
	status: string;
	tone: 'waiting' | 'active' | 'done' | 'failed';
	progress: number | null;
	meta: string;
	error?: string | null;
	children?: React.ReactNode;
};

function QueueRow(props: RowProps) {
	const { imageUrl, title, status, tone, progress, meta, error, children } =
		props;
	return (
		<li className={styles.item}>
			<img className={styles.thumb} src={imageUrl} alt="" />
			<div className={styles.body}>
				<div className={styles.title}>{title}</div>
				<div className={`${styles.status} ${styles[tone]}`}>
					{tone === 'active' ? (
						<LogoInkwellPulse size={18} />
					) : (
						<span className={styles.dot} aria-hidden="true" />
					)}
					<span role="status">{status}</span>
				</div>
				{tone === 'active' && (
					<progress
						className={styles.progress}
						value={progress ?? undefined}
						max={1}
					/>
				)}
				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
				<p className={styles.meta}>{meta}</p>
			</div>
			{children && <div className={styles.actions}>{children}</div>}
		</li>
	);
}

const TONES: Record<WorkItem['status'], RowProps['tone']> = {
	pending: 'waiting',
	running: 'active',
	completed: 'done',
	failed: 'failed'
};

function WorkRow(props: {
	item: WorkItem;
	local?: ImageScanTask;
	isMobile: boolean;
}) {
	const { item, local, isMobile } = props;
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [busy, setBusy] = useState(false);
	const [allowMobileScan, setAllowMobileScan] = useState(false);
	const mobileWarningId = useId();
	const [actionError, setActionError] = useState<string | null>(null);
	const deck = item.deck;

	async function act(action: () => Promise<void>, message: string) {
		setBusy(true);
		setActionError(null);
		try {
			await action();
		} catch (cause) {
			setActionError(cause instanceof Error ? cause.message : message);
		} finally {
			setBusy(false);
		}
	}

	function scanHere() {
		return act(async () => {
			if (isMobile && !allowMobileScan) return;
			const taskId = await dispatch(runQueuedScan(item));
			if (!taskId || !deck)
				throw new Error('Another device already started this scan');
			navigate(`/deck/${deck.deckId}/scan/${taskId}`);
		}, 'Could not start the scan');
	}
	function remove() {
		return act(
			() => dispatch(removeWork(item.workId)),
			'Could not remove this item'
		);
	}

	return (
		<QueueRow
			imageUrl={item.imageUrl}
			title={
				deck ? (
					<>
						Card photo for{' '}
						<Link to={`/deck/${deck.deckId}`}>{deck.name}</Link>
					</>
				) : (
					'Card photo for a deleted deck'
				)
			}
			status={workStatusText(item, local)}
			tone={TONES[item.status]}
			progress={workProgress(item, local)}
			meta={`Queued ${timeAgo(item.createdAt)} · ${item.fileName}`}
			error={
				actionError ?? (item.status === 'failed' ? item.error : null)
			}
		>
			{local && deck && (
				<Link
					className={styles.button}
					to={`/deck/${deck.deckId}/scan/${local.id}`}
				>
					View scan
				</Link>
			)}
			{item.status === 'pending' && deck && (
				<>
					{isMobile && (
						<label className={styles.mobileOptIn}>
							<input
								type="checkbox"
								checked={allowMobileScan}
								disabled={busy}
								onChange={(event) =>
									setAllowMobileScan(event.target.checked)
								}
								aria-describedby={mobileWarningId}
							/>
							<span>
								Allow this scan on this device
								<small id={mobileWarningId}>
									Scanning is data and energy intensive: it
									downloads large recognition models and can
									drain your battery. Wi-Fi and a charger are
									recommended.
								</small>
							</span>
						</label>
					)}
					<button
						type="button"
						className={styles.button}
						disabled={busy || (isMobile && !allowMobileScan)}
						onClick={() => void scanHere()}
						aria-describedby={
							isMobile ? mobileWarningId : undefined
						}
					>
						{isMobile ? 'Scan on this device' : 'Scan here now'}
					</button>
				</>
			)}
			{item.status === 'failed' && (
				<button
					type="button"
					className={styles.primary}
					disabled={busy}
					onClick={() =>
						void act(
							() => dispatch(retryWork(item.workId)),
							'Could not retry this item'
						)
					}
				>
					Try again
				</button>
			)}
			{item.status === 'completed' && deck && !local && (
				<Link className={styles.button} to={`/deck/${deck.deckId}`}>
					Open deck
				</Link>
			)}
			<button
				type="button"
				className={styles.quiet}
				disabled={busy}
				onClick={() => void remove()}
			>
				{item.status === 'completed'
					? 'Dismiss'
					: item.status === 'running'
						? 'Cancel'
						: 'Remove'}
			</button>
		</QueueRow>
	);
}

function LocalScanRow(props: { task: ImageScanTask }) {
	const { task } = props;
	const dispatch = useAppDispatch();
	const tone =
		task.status === 'error'
			? 'failed'
			: task.status === 'completed'
				? 'done'
				: 'active';
	return (
		<QueueRow
			imageUrl={task.imageUrl}
			title="Card photo scanning on this device"
			status={statusText(task)}
			tone={tone}
			progress={task.total > 0 && !task.progressIndeterminate ? task.completed / task.total : null}
			meta={task.fileName}
			error={task.error}
		>
			<Link
				className={styles.button}
				to={`/deck/${task.deckId}/scan/${task.id}`}
			>
				View scan
			</Link>
			{!isScanActive(task) && (
				<button
					type="button"
					className={styles.quiet}
					onClick={() => dispatch(dismissScan(task.id))}
				>
					Dismiss
				</button>
			)}
		</QueueRow>
	);
}

export function QueuePage() {
	const dispatch = useAppDispatch();
	const { items, error } = useWorkQueue();
	const scans = useImageImportQueue();
	const [isMobile] = useState(() => dispatch(scansAreSlowHere()));
	const [clearing, setClearing] = useState(false);
	const localByWork = new Map(
		scans.filter((task) => task.workId).map((task) => [task.workId, task])
	);
	const localOnly = scans.filter((task) => !task.workId);
	const open = (items ?? []).filter(isOpenWork);
	const finished = (items ?? []).filter((item) => !isOpenWork(item));
	const isEmpty =
		items !== null && items.length === 0 && localOnly.length === 0;

	async function clearFinished() {
		setClearing(true);
		try {
			for (const item of finished) await dispatch(removeWork(item.workId));
		} catch {
			// Rows that couldn't be removed stay listed; the next refresh shows what's left.
		} finally {
			setClearing(false);
		}
	}

	return (
		<NextPage title="Queued work">
			<Page>
				<main className={styles.page}>
					<header className={styles.header}>
						<h1>Queued work</h1>
						<p>
							{isMobile
								? 'Card photos you add on a phone wait here for a computer to scan them and add the cards to their deck. You can also opt in to scan individual photos on this device.'
								: 'Card photos added on a phone wait here. This computer scans them automatically while Cube Light is open, then adds the cards to their deck.'}
						</p>
					</header>
					{error && (
						<p className={styles.error} role="alert">
							Unable to refresh queued work.
						</p>
					)}
					{items === null && !error ? (
						<p className={styles.empty}>Loading queued work…</p>
					) : isEmpty ? (
						<div className={styles.emptyState}>
							<strong>Nothing queued</strong>
							<p>
								When you add cards from a photo on your phone,
								the photo waits here for a computer, or you can
								choose to scan it on your device.
							</p>
						</div>
					) : (
						<>
							{(open.length > 0 || localOnly.length > 0) && (
								<section className={styles.section}>
									<h2>Up next</h2>
									<ul className={styles.list}>
										{open.map((item) => (
											<WorkRow
												key={item.workId}
												item={item}
												local={localByWork.get(
													item.workId
												)}
												isMobile={isMobile}
											/>
										))}
										{localOnly.map((task) => (
											<LocalScanRow
												key={task.id}
												task={task}
											/>
										))}
									</ul>
								</section>
							)}
							{finished.length > 0 && (
								<section className={styles.section}>
									<div className={styles.sectionHeader}>
										<h2>Finished</h2>
										<button
											type="button"
											className={styles.quiet}
											disabled={clearing}
											onClick={() => void clearFinished()}
										>
											Clear finished
										</button>
									</div>
									<ul className={styles.list}>
										{finished.map((item) => (
											<WorkRow
												key={item.workId}
												item={item}
												local={localByWork.get(
													item.workId
												)}
												isMobile={isMobile}
											/>
										))}
									</ul>
								</section>
							)}
						</>
					)}
				</main>
			</Page>
		</NextPage>
	);
}

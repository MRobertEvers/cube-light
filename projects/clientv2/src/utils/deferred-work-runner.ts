import {
	fetchAPIClaimWork,
	fetchAPICompleteWork,
	fetchAPIFailWork,
	fetchAPIWorkImage,
	fetchAPIWorkProgress,
	WorkClaimLostError,
	type WorkItem
} from 'src/api/fetch-api-work';
import { API_URI } from 'src/config/api-url';
import { imageImportQueue, type ImageScanRunner } from './image-import-queue';
import { isMobileDevice } from './is-mobile-device';
import { workQueue } from './work-queue';

/** Well inside the server's 90 s lease, even with background-tab timer throttling. */
const HEARTBEAT_MS = 30 * 1000;
const PROGRESS_MIN_INTERVAL_MS = 4 * 1000;

/** Items this tab has claimed, or is claiming, so a refresh doesn't pick them up twice. */
const handled = new Set<string>();
/** Claim tokens this tab holds, handed back if the tab goes away mid-scan. */
const claims = new Map<string, string>();

// Without this a reloaded or closed tab would leave its items stuck until the lease lapses.
window.addEventListener('pagehide', () => {
	for (const [workId, token] of claims) {
		navigator.sendBeacon(`${API_URI}/work/${workId}/release`, token);
	}
});

function createRunner(workId: string, token: string): ImageScanRunner {
	let completed = 0;
	let total = 0;
	let lost = false;
	let lastSent = 0;
	function send() {
		lastSent = Date.now();
		fetchAPIWorkProgress(workId, token, completed, total).catch((error) => {
			if (error instanceof WorkClaimLostError) lost = true;
		});
	}
	// Loading the OCR model reports no progress for a while; keep the lease alive regardless.
	const heartbeat = window.setInterval(send, HEARTBEAT_MS);
	claims.set(workId, token);
	return {
		workId,
		progress: function (nextCompleted, nextTotal) {
			completed = nextCompleted;
			total = nextTotal;
			if (Date.now() - lastSent >= PROGRESS_MIN_INTERVAL_MS) send();
		},
		commit: function (cards) {
			return fetchAPICompleteWork(workId, token, cards);
		},
		fail: function (error) {
			void fetchAPIFailWork(workId, token, error).catch(() => {});
		},
		isLost: function () {
			return lost;
		},
		finished: function () {
			window.clearInterval(heartbeat);
			claims.delete(workId);
			void workQueue.refresh().finally(() => handled.delete(workId));
		}
	};
}

/**
 * Claims a queued photo and scans it in this tab. Returns the local scan's id, or null
 * when another device got to it first.
 */
export async function runWorkItemHere(item: WorkItem): Promise<string | null> {
	if (item.kind !== 'card-image-ocr' || !item.deck) return null;
	if (handled.has(item.workId)) return null;
	handled.add(item.workId);
	let token: string;
	try {
		token = await fetchAPIClaimWork(item.workId);
	} catch {
		handled.delete(item.workId);
		return null;
	}
	const runner = createRunner(item.workId, token);
	void workQueue.refresh();
	try {
		const file = await fetchAPIWorkImage(item);
		return imageImportQueue.enqueue(
			item.deck.deckId,
			file,
			runner,
			item.pipeline ?? 'card-aware'
		);
	} catch (error) {
		runner.fail(
			error instanceof Error
				? error.message
				: 'Could not download the queued photo'
		);
		runner.finished();
		return null;
	}
}

/**
 * Phones queue card photos instead of scanning them; a desktop tab picks the waiting ones
 * up whenever it loads the site or comes back into view. Returns a stop function, for
 * when the session ends; scans already running here finish or fail on their own.
 */
export function startDeferredWorkRunner(): (() => void) | undefined {
	if (isMobileDevice()) return undefined;
	return workQueue.subscribe(() => {
		for (const item of workQueue.getSnapshot().items ?? []) {
			if (item.status === 'pending') void runWorkItemHere(item);
		}
	});
}

import type { WorkApi } from '../api/work';
import { WorkClaimLostError, type WorkItem } from '../../domain/models/work';
import type { ImageImportQueue, ImageScanRunner } from './image-import-queue';
import type { WorkQueue } from './work-queue';
import type { EngineEvents } from '../events';
import type { DeviceProfile, PageLifecycle } from '../ports';

/** Well inside the server's 90 s lease, even with background-tab timer throttling. */
const HEARTBEAT_MS = 30 * 1000;
const PROGRESS_MIN_INTERVAL_MS = 4 * 1000;

/**
 * Phones queue card photos instead of scanning them; a desktop tab picks the waiting ones
 * up whenever it loads the site or comes back into view, and scans them here.
 */
export class DeferredWorkRunner {
	private readonly work: WorkApi;
	private readonly workQueue: WorkQueue;
	private readonly imageImports: ImageImportQueue;
	private readonly events: EngineEvents;
	private readonly lifecycle: PageLifecycle;
	private readonly device: DeviceProfile;
	/** Items this tab has claimed, or is claiming, so a refresh doesn't pick them up twice. */
	private readonly handled = new Set<string>();
	/** Claim tokens this tab holds, handed back if the tab goes away mid-scan. */
	private readonly claims = new Map<string, string>();
	private releasingOnLeave = false;

	constructor(
		work: WorkApi,
		workQueue: WorkQueue,
		imageImports: ImageImportQueue,
		events: EngineEvents,
		lifecycle: PageLifecycle,
		device: DeviceProfile
	) {
		this.work = work;
		this.workQueue = workQueue;
		this.imageImports = imageImports;
		this.events = events;
		this.lifecycle = lifecycle;
		this.device = device;
		this.releaseClaims = this.releaseClaims.bind(this);
	}

	/**
	 * Starts picking up waiting items on this device. Returns a stop function, for when
	 * the session ends; scans already running here finish or fail on their own.
	 */
	start(): () => void {
		if (this.device.isMobile()) return function () {};
		// Without this a reloaded or closed tab would leave its items stuck until the lease lapses.
		if (!this.releasingOnLeave) {
			this.lifecycle.onLeave(this.releaseClaims);
			this.releasingOnLeave = true;
		}
		const stopWatching = this.workQueue.watch();
		const unsubscribe = this.events.subscribe((event) => {
			if (event.type !== 'work-queue-changed') return;
			for (const item of event.items ?? []) {
				if (item.status === 'pending') void this.runHere(item);
			}
		});
		return function stop() {
			unsubscribe();
			stopWatching();
		};
	}

	/**
	 * Claims a queued photo and scans it in this tab. Returns the local scan's id, or null
	 * when another device got to it first.
	 */
	async runHere(item: WorkItem): Promise<string | null> {
		if (item.kind !== 'card-image-ocr' || !item.deck) return null;
		if (this.handled.has(item.workId)) return null;
		this.handled.add(item.workId);
		let token: string;
		try {
			token = await this.work.claim(item.workId);
		} catch {
			this.handled.delete(item.workId);
			return null;
		}
		const runner = this.createRunner(item.workId, token);
		void this.workQueue.refresh();
		try {
			const file = await this.work.image(item);
			return this.imageImports.enqueue(
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

	private releaseClaims() {
		for (const [workId, token] of this.claims) {
			void this.work.release(workId, token).catch(() => undefined);
		}
	}

	private createRunner(workId: string, token: string): ImageScanRunner {
		const work = this.work;
		const workQueue = this.workQueue;
		const handled = this.handled;
		const claims = this.claims;
		let completed = 0;
		let total = 0;
		let lost = false;
		let lastSent = 0;
		function send() {
			lastSent = Date.now();
			work.progress(workId, token, completed, total).catch((error) => {
				if (error instanceof WorkClaimLostError) lost = true;
			});
		}
		// Loading the OCR model reports no progress for a while; keep the lease alive regardless.
		const heartbeat = setInterval(send, HEARTBEAT_MS);
		claims.set(workId, token);
		return {
			workId,
			progress: function (nextCompleted, nextTotal) {
				completed = nextCompleted;
				total = nextTotal;
				if (Date.now() - lastSent >= PROGRESS_MIN_INTERVAL_MS) send();
			},
			commit: function (cards) {
				return work.complete(workId, token, cards);
			},
			fail: function (error) {
				void work.fail(workId, token, error).catch(() => {});
			},
			isLost: function () {
				return lost;
			},
			finished: function () {
				clearInterval(heartbeat);
				claims.delete(workId);
				void workQueue.refresh().finally(() => handled.delete(workId));
			}
		};
	}
}

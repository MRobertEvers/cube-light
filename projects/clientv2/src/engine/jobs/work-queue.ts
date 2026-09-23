import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import type { WorkItem } from '../../domain/models/work';
import type { WorkApi } from '../api/work';
import type { EngineEvents } from '../events';
import type { PageLifecycle } from '../ports';

/** Often enough to watch a desktop's progress from a phone without hammering the server. */
const ACTIVE_POLL_MS = 10 * 1000;

/**
 * The server-held queue of work deferred to a desktop. While watched, it publishes every
 * change as a work-queue-changed event and polls the server while items are running.
 */
export class WorkQueue {
	private readonly work: WorkApi;
	private readonly events: EngineEvents;
	private readonly lifecycle: PageLifecycle;
	private items: WorkItem[] | null = null;
	private error = false;
	private watchers = 0;
	private pollTimer: ReturnType<typeof setTimeout> | undefined;
	private inFlight: Promise<void> | null = null;
	private stopWatching: Array<() => void> = [];

	constructor(work: WorkApi, events: EngineEvents, lifecycle: PageLifecycle) {
		this.work = work;
		this.events = events;
		this.lifecycle = lifecycle;
	}

	/** The queue as last read, or null before the first read. */
	current(): WorkItem[] | null {
		return this.items;
	}

	/** Starts publishing changes. Returns a function that stops once every watcher has. */
	watch(): () => void {
		this.watchers++;
		if (this.watchers === 1) this.start();
		let stopped = false;
		return () => {
			if (stopped) return;
			stopped = true;
			this.watchers--;
			if (this.watchers === 0) this.stop();
		};
	}

	/** Rereads the queue now. Concurrent callers share one read. */
	refresh(): Promise<void> {
		this.inFlight ??= this.work
			.items()
			.then(
				(items) => this.publish(items, false),
				() => this.publish(this.items, true)
			)
			.finally(() => {
				this.inFlight = null;
				this.schedulePoll();
			});
		return this.inFlight;
	}

	queueCardImage(deckId: string, file: File, pipeline: CardImagePipeline): Promise<WorkItem> {
		return this.work.queueCardImage(deckId, file, pipeline);
	}

	async retry(workId: string): Promise<void> {
		await this.work.retry(workId);
	}

	async remove(workId: string): Promise<void> {
		await this.work.delete(workId);
		if (this.items) this.publish(this.items.filter((item) => item.workId !== workId), this.error);
	}

	private start() {
		this.stopWatching = [
			this.work.observeItems(
				(items) => {
					this.publish(items, false);
					this.schedulePoll();
				},
				() => this.publish(this.items, true)
			),
			this.lifecycle.onResume(() => this.askServer())
		];
	}

	private stop() {
		for (const stop of this.stopWatching) stop();
		this.stopWatching = [];
		clearTimeout(this.pollTimer);
		this.publish(null, false);
	}

	/** Asks the server for new progress; the local observer publishes whatever arrives. */
	private askServer() {
		void this.work.requestRefresh().catch(() => undefined);
	}

	private publish(items: WorkItem[] | null, error: boolean) {
		this.items = items;
		this.error = error;
		this.events.emit({ type: 'work-queue-changed', items, error });
	}

	private schedulePoll() {
		clearTimeout(this.pollTimer);
		const active = this.items?.some((item) => item.status === 'pending' || item.status === 'running');
		if (!active || this.watchers === 0) return;
		this.pollTimer = setTimeout(() => {
			if (this.lifecycle.isVisible()) this.askServer();
			this.schedulePoll();
		}, ACTIVE_POLL_MS);
	}
}

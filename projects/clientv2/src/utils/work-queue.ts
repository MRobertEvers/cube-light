import type { CardImagePipeline } from './image-scan-pipelines';
import { useSyncExternalStore } from 'react';
import {
	fetchAPIDeleteWork,
	fetchAPIQueueCardImage,
	fetchAPIRetryWork,
	fetchAPIWorkItems,
	type WorkItem
} from 'src/api/fetch-api-work';

export type WorkQueueSnapshot = {
	/** Null until the first load finishes. */
	items: WorkItem[] | null;
	error: boolean;
};

/** Often enough to watch a desktop's progress from a phone without hammering the server. */
const ACTIVE_POLL_MS = 10 * 1000;

/** The server-held queue of work deferred to a desktop, shared by every view that shows it. */
class WorkQueue {
	private snapshot: WorkQueueSnapshot = { items: null, error: false };
	private listeners = new Set<() => void>();
	private pollTimer: number | undefined;
	private inFlight: Promise<void> | null = null;

	constructor() {
		this.subscribe = this.subscribe.bind(this);
		this.getSnapshot = this.getSnapshot.bind(this);
		this.onVisible = this.onVisible.bind(this);
	}

	subscribe(listener: () => void) {
		const instance = this;
		this.listeners.add(listener);
		if (this.listeners.size === 1) this.start();
		return function unsubscribe() {
			instance.listeners.delete(listener);
			if (instance.listeners.size === 0) instance.stop();
		};
	}

	getSnapshot() {
		return this.snapshot;
	}

	private onVisible() {
		if (document.visibilityState === 'visible') void this.refresh();
	}

	private start() {
		document.addEventListener('visibilitychange', this.onVisible);
		window.addEventListener('online', this.onVisible);
		void this.refresh();
	}

	private stop() {
		document.removeEventListener('visibilitychange', this.onVisible);
		window.removeEventListener('online', this.onVisible);
		window.clearTimeout(this.pollTimer);
	}

	private publish(snapshot: WorkQueueSnapshot) {
		this.snapshot = snapshot;
		for (const listener of this.listeners) listener();
	}

	/** Concurrent callers share one request. */
	refresh(): Promise<void> {
		this.inFlight ??= fetchAPIWorkItems()
			.then(
				(items) => this.publish({ items, error: false }),
				() =>
					this.publish({
						...this.snapshot,
						error: true
					})
			)
			.finally(() => {
				this.inFlight = null;
				this.schedulePoll();
			});
		return this.inFlight;
	}

	private schedulePoll() {
		window.clearTimeout(this.pollTimer);
		const active = this.snapshot.items?.some(
			(item) => item.status === 'pending' || item.status === 'running'
		);
		if (!active || this.listeners.size === 0) return;
		this.pollTimer = window.setTimeout(() => {
			if (document.visibilityState === 'visible') void this.refresh();
			else this.schedulePoll();
		}, ACTIVE_POLL_MS);
	}

	async queueCardImage(
		deckId: string,
		file: File,
		pipelineArg?: CardImagePipeline
	): Promise<WorkItem> {
		const pipeline = pipelineArg === undefined ? 'card-aware' : pipelineArg;

		const item = await fetchAPIQueueCardImage(deckId, file, pipeline);
		void this.refresh();
		return item;
	}

	async retry(workId: string): Promise<void> {
		await fetchAPIRetryWork(workId);
		await this.refresh();
	}

	async remove(workId: string): Promise<void> {
		await fetchAPIDeleteWork(workId);
		if (this.snapshot.items) {
			this.publish({
				...this.snapshot,
				items: this.snapshot.items.filter(
					(item) => item.workId !== workId
				)
			});
		}
		await this.refresh();
	}
}

export const workQueue = new WorkQueue();

export function useWorkQueue(): WorkQueueSnapshot {
	return useSyncExternalStore(workQueue.subscribe, workQueue.getSnapshot);
}

/** Items still worth the user's attention: anything not yet finished cleanly and dismissed. */
export function isOpenWork(item: WorkItem): boolean {
	return item.status !== 'completed';
}

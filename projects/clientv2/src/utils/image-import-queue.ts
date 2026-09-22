import type { CardImagePipeline } from './image-scan-pipelines';
import { fetchAPICardNames } from 'src/api/fetch-api-card-names';
import {
	fetchAPIImportCards,
	type ImportedCard
} from 'src/api/fetch-api-import-cards';
import { WorkClaimLostError } from 'src/api/fetch-api-work';
import {
	scanCardImage,
	type CardImageCandidate,
	type ImageRegion
} from './card-image-ocr';
import { resolvedCandidateAdditions } from './image-import-auto-add';

export type ImageScanStatus =
	'queued' | 'loading' | 'scanning' | 'adding' | 'completed' | 'error';

export type ImageScanTask = {
	id: string;
	deckId: string;
	imageUrl: string;
	fileName: string;
	pipeline: CardImagePipeline;
	status: ImageScanStatus;
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
	phaseLabel?: string;
	progressIndeterminate?: boolean;
	addedCounts: Record<string, number>;
	plannedCounts: Record<string, number>;
	error: string | null;
	/** Set when this scan is a phone's queued photo that this device picked up. */
	workId: string | null;
};

/** Reports a picked-up queued scan back to the server that holds it. */
export type ImageScanRunner = {
	workId: string;
	progress(completed: number, total: number): void;
	/** Adds the scan's cards in one step, so an abandoned run can't add them twice. */
	commit(cards: ImportedCard[]): Promise<void>;
	fail(error: string): void;
	/** Another device claimed the item after this one stopped reporting in. */
	isLost(): boolean;
	finished(): void;
};

type InternalTask = ImageScanTask & {
	file: File;
	writes: Promise<void>;
	runner: ImageScanRunner | null;
};

class ImageImportQueue {
	private tasks: InternalTask[] = [];
	private snapshot: ImageScanTask[] = [];
	private listeners = new Set<() => void>();
	private running = false;
	private nextId = 0;

	constructor() {
		this.subscribe = this.subscribe.bind(this);
		this.getSnapshot = this.getSnapshot.bind(this);
	}

	subscribe(listener: () => void) {
		const instance = this;
		this.listeners.add(listener);
		return function unsubscribe() {
			instance.listeners.delete(listener);
		};
	}

	getSnapshot() {
		return this.snapshot;
	}

	private publish() {
		this.snapshot = this.tasks.map((args) => {
			const {
				file: _file,
				writes: _writes,
				runner: _runner,
				...task
			} = args;
			return {
				...task,
				candidates: [...task.candidates],
				addedCounts: { ...task.addedCounts },
				plannedCounts: { ...task.plannedCounts }
			};
		});
		for (const listener of this.listeners) listener();
	}

	enqueue(
		deckId: string,
		file: File,
		runnerArg?: ImageScanRunner | null,
		pipelineArg?: CardImagePipeline
	): string {
		const runner = runnerArg === undefined ? null : runnerArg;
		const pipeline = pipelineArg === undefined ? 'card-aware' : pipelineArg;

		const id = `scan-${++this.nextId}`;
		this.tasks.push({
			id,
			deckId,
			file,
			imageUrl: URL.createObjectURL(file),
			fileName: file.name,
			pipeline,
			status: 'queued',
			completed: 0,
			total: 0,
			region: null,
			candidates: [],
			addedCounts: {},
			plannedCounts: {},
			error: null,
			workId: runner?.workId ?? null,
			writes: Promise.resolve(),
			runner
		});
		this.publish();
		void this.pump();
		return id;
	}

	dismiss(id: string) {
		const task = this.tasks.find((item) => item.id === id);
		if (!task || !['completed', 'error'].includes(task.status)) return;
		URL.revokeObjectURL(task.imageUrl);
		this.tasks = this.tasks.filter((item) => item.id !== id);
		this.publish();
	}

	private scheduleAdditions(
		task: InternalTask,
		cards: ImportedCard[]
	): Promise<void> {
		if (cards.length === 0 || task.error) return task.writes;
		for (const card of cards) {
			task.plannedCounts[card.name] =
				(task.plannedCounts[card.name] ?? 0) + card.count;
		}
		this.publish();
		task.writes = task.writes.then(async () => {
			if (task.error) return;
			try {
				await fetchAPIImportCards(task.deckId, cards);
				for (const card of cards) {
					task.addedCounts[card.name] =
						(task.addedCounts[card.name] ?? 0) + card.count;
				}
				this.publish();
			} catch (error) {
				task.error =
					error instanceof Error
						? error.message
						: 'Could not add identified cards';
				task.status = 'error';
				this.publish();
			}
		});
		return task.writes;
	}

	private scheduleResolvedMatches(task: InternalTask) {
		// Queued work commits everything once the scan finishes instead.
		if (task.runner) return;
		void this.scheduleAdditions(
			task,
			resolvedCandidateAdditions(task.candidates, task.plannedCounts)
		);
	}

	async addCandidate(
		taskId: string,
		name: string,
		count: number
	): Promise<void> {
		const task = this.tasks.find((item) => item.id === taskId);
		if (!task || task.error || !Number.isInteger(count) || count <= 0)
			return;
		await this.scheduleAdditions(task, [{ name, count }]);
	}

	private async commit(task: InternalTask, runner: ImageScanRunner) {
		const cards = resolvedCandidateAdditions(
			task.candidates,
			task.plannedCounts
		);
		for (const card of cards) {
			task.plannedCounts[card.name] =
				(task.plannedCounts[card.name] ?? 0) + card.count;
		}
		this.publish();
		// Manual additions made during the scan went straight to the deck; wait for them first.
		await task.writes;
		await runner.commit(cards);
		for (const card of cards) {
			task.addedCounts[card.name] =
				(task.addedCounts[card.name] ?? 0) + card.count;
		}
	}

	private async pump() {
		if (this.running) return;
		this.running = true;
		try {
			while (true) {
				const task = this.tasks.find(
					(item) => item.status === 'queued'
				);
				if (!task) break;
				task.status = 'loading';
				this.publish();
				const { runner } = task;
				try {
					const names = await fetchAPICardNames();
					await scanCardImage(
						task.file,
						names,
						(update) => {
							if (task.error) return;
							task.status =
								update.phase === 'loading'
									? 'loading'
									: 'scanning';
							task.phaseLabel = update.message;
							task.progressIndeterminate = update.indeterminate;
							task.completed = update.completed;
							task.total = update.total;
							task.region = update.region;
							task.candidates = update.candidates;
							runner?.progress(update.completed, update.total);
							this.scheduleResolvedMatches(task);
							this.publish();
						},
						() => !!task.error || !!runner?.isLost(),
						{ pipeline: task.pipeline }
					);
					if (runner?.isLost()) throw new WorkClaimLostError();
					if (!task.error) {
						task.status = 'adding';
						task.completed = 99;
						task.total = 100;
						task.progressIndeterminate = true;
						task.region = null;
						this.publish();
					}
					if (runner && !task.error) await this.commit(task, runner);
					await task.writes;
					if (!task.error) {
						task.status = 'completed';
						task.completed = 100;
						task.total = 100;
						task.progressIndeterminate = false;
					}
				} catch (error) {
					task.error =
						error instanceof Error
							? error.message
							: 'Could not scan this image';
					task.status = 'error';
				} finally {
					task.region = null;
					if (runner) {
						if (task.error && !runner.isLost())
							runner.fail(task.error);
						runner.finished();
					}
					this.publish();
				}
			}
		} finally {
			this.running = false;
		}
	}
}

export const imageImportQueue = new ImageImportQueue();

import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import type { CardApi } from '../api/cards';
import type { DeckApi } from '../api/decks';
import type { ImportedCard } from '../../domain/models/deck';
import { WorkClaimLostError } from '../../domain/models/work';
import { resolvedCandidateAdditions } from '../../domain/scans/image-import-auto-add';
import type { ImageScanTask } from '../../domain/scans/image-scan-task';
import type { EngineEvents } from '../events';
import type { CardScanner } from '../ports';

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

/**
 * Card photos being scanned on this device, one at a time. Every change is published as a
 * scans-changed event; found cards are added to the deck as they are recognised.
 */
export class ImageImportQueue {
	private readonly decks: DeckApi;
	private readonly cards: CardApi;
	private readonly scanner: CardScanner;
	private readonly events: EngineEvents;
	private tasks: InternalTask[] = [];
	private running = false;
	private nextId = 0;

	constructor(decks: DeckApi, cards: CardApi, scanner: CardScanner, events: EngineEvents) {
		this.decks = decks;
		this.cards = cards;
		this.scanner = scanner;
		this.events = events;
	}

	/** The scans as they stand now. */
	current(): ImageScanTask[] {
		return this.tasks.map((task) => {
			const scan: ImageScanTask = {
				id: task.id,
				deckId: task.deckId,
				imageUrl: task.imageUrl,
				fileName: task.fileName,
				pipeline: task.pipeline,
				status: task.status,
				completed: task.completed,
				total: task.total,
				region: task.region,
				candidates: task.candidates.slice(),
				addedCounts: Object.assign({}, task.addedCounts),
				plannedCounts: Object.assign({}, task.plannedCounts),
				error: task.error,
				workId: task.workId
			};
			if ('phaseLabel' in task) scan.phaseLabel = task.phaseLabel;
			if ('progressIndeterminate' in task) scan.progressIndeterminate = task.progressIndeterminate;
			return scan;
		});
	}

	private publish() {
		this.events.emit({ type: 'scans-changed', scans: this.current() });
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
				await this.decks.importList(task.deckId, cards);
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
					const names = await this.cards.allNames();
					await this.scanner.scan(
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


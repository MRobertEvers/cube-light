import { fetchAPICardNames } from 'src/api/fetch-api-card-names';
import {
	fetchAPIImportCards,
	type ImportedCard
} from 'src/api/fetch-api-import-cards';
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
	status: ImageScanStatus;
	completed: number;
	total: number;
	region: ImageRegion | null;
	candidates: CardImageCandidate[];
	addedCounts: Record<string, number>;
	plannedCounts: Record<string, number>;
	error: string | null;
};

type InternalTask = ImageScanTask & {
	file: File;
	writes: Promise<void>;
};

class ImageImportQueue {
	private tasks: InternalTask[] = [];
	private snapshot: ImageScanTask[] = [];
	private listeners = new Set<() => void>();
	private running = false;
	private nextId = 0;

	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	getSnapshot = () => this.snapshot;

	private publish() {
		this.snapshot = this.tasks.map((args) => {
			const { file: _file, writes: _writes, ...task } = args;
			return {
				...task,
				candidates: [...task.candidates],
				addedCounts: { ...task.addedCounts },
				plannedCounts: { ...task.plannedCounts }
			};
		});
		for (const listener of this.listeners) listener();
	}

	enqueue(deckId: string, file: File): string {
		const id = `scan-${++this.nextId}`;
		this.tasks.push({
			id,
			deckId,
			file,
			imageUrl: URL.createObjectURL(file),
			fileName: file.name,
			status: 'queued',
			completed: 0,
			total: 0,
			region: null,
			candidates: [],
			addedCounts: {},
			plannedCounts: {},
			error: null,
			writes: Promise.resolve()
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
							task.completed = update.completed;
							task.total = update.total;
							task.region = update.region;
							task.candidates = update.candidates;
							this.scheduleResolvedMatches(task);
							this.publish();
						},
						() => !!task.error
					);
					if (!task.error) {
						task.status = 'adding';
						task.region = null;
						this.publish();
					}
					await task.writes;
					if (!task.error) task.status = 'completed';
				} catch (error) {
					task.error =
						error instanceof Error
							? error.message
							: 'Could not scan this image';
					task.status = 'error';
				} finally {
					task.region = null;
					this.publish();
				}
			}
		} finally {
			this.running = false;
		}
	}
}

export const imageImportQueue = new ImageImportQueue();

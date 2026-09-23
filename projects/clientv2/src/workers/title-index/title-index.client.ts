import type { ShardMatch, TitleIndexRequest, TitleIndexResponse } from './title-index.protocol';

type Lookup = {
	results: ShardMatch[][];
	remaining: number;
	resolve: (shards: ShardMatch[][]) => void;
	reject: (error: Error) => void;
};

/**
 * The main-thread binding to a pool of TitleIndexWorkers. Each worker holds one shard of the
 * card names; a lookup asks every shard and answers with each shard's matches.
 */
export class TitleIndexWorkerPool {
	private readonly workers: Worker[];
	private readonly lookups = new Map<number, Lookup>();
	private nextId = 0;

	/** Builds every shard; rejects (and stops the workers) if any shard cannot be built. */
	static async build(
		names: string[],
		blur: number,
		fontUrl: string,
		onProgress: (progress: { completed: number; total: number }) => void
	): Promise<TitleIndexWorkerPool> {
		const size = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
		const pool = new TitleIndexWorkerPool(size);
		try {
			await pool.buildShards(names, blur, fontUrl, onProgress);
		} catch (error) {
			pool.dispose();
			throw error;
		}
		return pool;
	}

	private constructor(size: number) {
		this.workers = Array.from({ length: size }, function () {
			return new Worker(new URL('./title-index.worker.ts', import.meta.url), { type: 'module' });
		});
	}

	/** Each shard's best matches for one title descriptor, in shard order. */
	lookup(v: Float32Array, proj: Float32Array): Promise<ShardMatch[][]> {
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			this.lookups.set(id, { results: [], remaining: this.workers.length, resolve, reject });
			for (const worker of this.workers) this.post(worker, { kind: 'lookup', id, v, proj });
		});
	}

	dispose(): void {
		for (const worker of this.workers) worker.terminate();
		this.fail(new Error('Title index closed'));
	}

	private buildShards(
		names: string[],
		blur: number,
		fontUrl: string,
		onProgress: (progress: { completed: number; total: number }) => void
	): Promise<unknown> {
		const shard = Math.ceil(names.length / this.workers.length);
		const completed = new Array<number>(this.workers.length).fill(0);
		return Promise.all(
			this.workers.map((worker, k) => {
				return new Promise<void>((resolve, reject) => {
					worker.onerror = function (event) {
						reject(new Error(event.message || 'Title index worker failed'));
					};
					worker.onmessage = (event: MessageEvent<TitleIndexResponse>) => {
						const message = event.data;
						if (message.kind === 'progress') {
							completed[k] = message.completed;
							onProgress({ completed: completed.reduce((a, b) => a + b, 0), total: names.length });
						} else if (message.kind === 'failed') reject(new Error(message.error));
						else if (message.kind === 'built') {
							worker.onerror = (failure) => this.fail(new Error(failure.message || 'Title index worker failed'));
							resolve();
						} else this.received(k, message.id, message.matches);
					};
					this.post(worker, {
						kind: 'build',
						names: names.slice(k * shard, (k + 1) * shard),
						offset: k * shard,
						blur,
						fontUrl
					});
				});
			})
		);
	}

	private received(shard: number, id: number, matches: ShardMatch[]) {
		const lookup = this.lookups.get(id);
		if (!lookup) return;
		lookup.results[shard] = matches;
		if (--lookup.remaining === 0) {
			this.lookups.delete(id);
			lookup.resolve(lookup.results);
		}
	}

	private fail(error: Error) {
		for (const lookup of this.lookups.values()) lookup.reject(error);
		this.lookups.clear();
	}

	private post(worker: Worker, request: TitleIndexRequest) {
		worker.postMessage(request);
	}
}

import { promises as fs, statSync, openSync, readSync, closeSync } from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { artcache, nowSeconds, type ArtCacheHandle } from '../artcache';
import type { CardImageService } from '../card-images';
import { DEPTH_MODEL, DEPTH_STAMP } from './height-map';
import type { DepthWorkerRequest, DepthWorkerResponse, DepthWorkerSetup } from './depth-protocol';

/**
 * Height maps ("parallax art") of card art crops, made on request: the art crop from the
 * CardImageService, the map by the model on a thread of its own (depth-worker.ts), both kept in
 * the shared art cache (3rd/artcache/FORMAT.md) as `depth/<id>.png`, where torimtgd's maps are
 * too. The two servers make the same maps (height-map.ts) under one stamp and use each other's.
 *
 * On one machine a map is claimed in the cache's index while it is made, so no two processes
 * make it at once; a map another process is making is answered "pending". A map of another
 * stamp is served while it is made again, unless it is newer than ours (the same model, a later
 * pipeline): servers of other revisions sharing the folder never take turns remaking maps.
 */

export type DepthMapAnswer =
	| { state: 'ready'; png: Buffer }
	| { state: 'pending'; retryAfterSeconds: number }
	| { state: 'missing' };

export interface DepthMapStatus {
	available: boolean;
	stamp: string;
	/** Why maps cannot be made here, when they cannot. */
	reason: string | null;
}

export interface DepthMapOptions {
	/** The art cache's folder and this machine's index (null: artcache's default). */
	root: string;
	index?: string | null;
	/** The ONNX model; omitted: models/depth-anything-v2-small/model.onnx in this package. */
	modelPath?: string;
	/** How long a request waits for a map being made for it before it is told to come back. */
	waitMs?: number;
	/** The model's thread is stopped after this long without work (it holds the model). */
	idleMs?: number;
	now?: () => number;
}

const KIND = 'depth';
const MAX_ATTEMPTS = 2;
const LEASE_SECONDS = 300;
const RETRY_AFTER_SECONDS = 3;

// build/src/images/depth -> the package's models/ folder
export const DEFAULT_DEPTH_MODEL = path.join(
	__dirname,
	'../../../../models/depth-anything-v2-small/model.onnx'
);

type Outcome = 'made' | 'failed' | 'elsewhere';

/** Why the model file cannot be used, or null when it can. */
export function depthModelProblem(modelPath: string): string | null {
	let size = 0;
	try {
		size = statSync(modelPath).size;
	} catch {
		return `the depth model is missing (${modelPath}): run npm run fetch:depth-model`;
	}
	if (size < 1024 * 1024) {
		// A Git LFS pointer is a few lines of text where the model should be.
		const head = Buffer.alloc(64);
		const fd = openSync(modelPath, 'r');
		readSync(fd, head, 0, 64, 0);
		closeSync(fd);
		return head.toString('latin1').startsWith('version https://git-lfs')
			? 'the depth model is a Git LFS pointer: run git lfs pull or npm run fetch:depth-model'
			: `the depth model is too small to be one (${modelPath})`;
	}
	return null;
}

/** "<model> pipeline <N>": its parts, or null. */
function parseStamp(stamp: string): { model: string; pipeline: number } | null {
	const at = stamp.lastIndexOf(' pipeline ');
	if (at < 0) return null;
	const pipeline = Number(stamp.slice(at + 10));
	return Number.isInteger(pipeline) ? { model: stamp.slice(0, at), pipeline } : null;
}

export class DepthMapService {
	private readonly cache: ArtCacheHandle;
	private readonly images: CardImageService;
	private readonly modelPath: string;
	private readonly waitMs: number;
	private readonly idleMs: number;
	private readonly now: () => number;
	private readonly problem: string | null;
	private readonly making = new Map<string, Promise<Outcome>>();
	private queue: Promise<unknown> = Promise.resolve();
	private worker: Worker | null = null;
	private readonly replies = new Map<number, { resolve: (png: Buffer) => void; reject: (error: Error) => void }>();
	private nextRequest = 1;
	private idleTimer: NodeJS.Timeout | null = null;

	constructor(images: CardImageService, options: DepthMapOptions) {
		const {
			root,
			index = null,
			modelPath = process.env.CUBELIGHT_DEPTH_MODEL || DEFAULT_DEPTH_MODEL,
			waitMs = 8000,
			idleMs = 10 * 60 * 1000,
			now = nowSeconds
		} = options;
		this.images = images;
		this.cache = artcache.open(root, index);
		this.modelPath = modelPath;
		this.waitMs = waitMs;
		this.idleMs = idleMs;
		this.now = now;
		this.problem = depthModelProblem(modelPath);
	}

	status(): DepthMapStatus {
		return { available: this.problem === null, stamp: DEPTH_STAMP, reason: this.problem };
	}

	/** Stops the model's thread and gives up this service's claims. */
	async close(): Promise<void> {
		if (this.idleTimer) clearTimeout(this.idleTimer);
		if (this.worker) await this.worker.terminate();
		this.worker = null;
		this.cache.close();
	}

	/** The map of art crop `id` (a Scryfall id, lowercase): there, being made, or not to be had. */
	async get(id: string): Promise<DepthMapAnswer> {
		const state = this.cache.lookup(KIND, id, DEPTH_STAMP, 0, this.now());
		if (state === 'present' || state === 'stale') {
			const png = await this.read(id);
			if (png) {
				if (state === 'stale' && this.problem === null && this.remakes(id)) {
					this.schedule(id).catch(() => undefined);
				}
				return { state: 'ready', png };
			}
		}
		if (this.problem !== null) return { state: 'missing' };
		if (state === 'claimed') return { state: 'pending', retryAfterSeconds: RETRY_AFTER_SECONDS };
		if (this.cache.attempts(KIND, id, DEPTH_STAMP) >= MAX_ATTEMPTS) return { state: 'missing' };

		const job = this.schedule(id);
		let timer: NodeJS.Timeout | null = null;
		const waited = await Promise.race([
			job,
			new Promise<'waiting'>((resolve) => {
				timer = setTimeout(() => resolve('waiting'), this.waitMs);
			})
		]);
		if (timer) clearTimeout(timer);
		if (waited === 'made') {
			const png = await this.read(id);
			if (png) return { state: 'ready', png };
		}
		if (waited === 'failed') return { state: 'missing' };
		return { state: 'pending', retryAfterSeconds: RETRY_AFTER_SECONDS };
	}

	private async read(id: string): Promise<Buffer | null> {
		const file = this.cache.path(KIND, id);
		if (!file) return null;
		try {
			return await fs.readFile(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			this.cache.forget(KIND, id);
			return null;
		}
	}

	/** Whether a map of another stamp is made again: not when it is newer than ours. */
	private remakes(id: string): boolean {
		const have = parseStamp(this.cache.fileVersion(KIND, id) || '');
		const ours = parseStamp(DEPTH_STAMP);
		return !(have && ours && have.model === ours.model && have.pipeline > ours.pipeline);
	}

	/** The map's making, one at a time: the model already takes every core. */
	private schedule(id: string): Promise<Outcome> {
		let job = this.making.get(id);
		if (!job) {
			job = this.queue.then(() => this.make(id));
			this.queue = job.catch(() => undefined);
			this.making.set(id, job);
			const made = job;
			made.finally(() => {
				if (this.making.get(id) === made) this.making.delete(id);
			}).catch(() => undefined);
		}
		return job;
	}

	private async make(id: string): Promise<Outcome> {
		const art = await this.images.get(id, 'art_crop');
		if (!art) return 'failed';
		if (!this.cache.claim(KIND, id, DEPTH_STAMP, LEASE_SECONDS, this.now())) {
			// Another process here is making it, or has made it since.
			return this.cache.lookup(KIND, id, DEPTH_STAMP, 0, this.now()) === 'present' ? 'made' : 'elsewhere';
		}
		const temporary = this.cache.tempPath(KIND, id);
		try {
			if (!temporary) throw new Error('no place in the art cache');
			const png = await this.run(art);
			await fs.writeFile(temporary, png);
			if (!this.cache.commit(KIND, id, temporary, DEPTH_STAMP, this.now())) {
				throw new Error('the map could not be put in the art cache');
			}
			return 'made';
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`Unable to make the height map of ${id}: ${message}`);
			this.cache.fail(KIND, id, temporary, DEPTH_STAMP, message, this.now());
			return 'failed';
		}
	}

	/** The art's map, from the model's thread (started on first use, stopped when idle). */
	private run(jpeg: Buffer): Promise<Buffer> {
		const worker = this.thread();
		const id = this.nextRequest++;
		return new Promise<Buffer>((resolve, reject) => {
			this.replies.set(id, { resolve, reject });
			const request: DepthWorkerRequest = { id, jpeg };
			worker.postMessage(request);
		}).finally(() => this.idle());
	}

	private thread(): Worker {
		if (this.idleTimer) clearTimeout(this.idleTimer);
		this.idleTimer = null;
		if (this.worker) return this.worker;
		const setup: DepthWorkerSetup = { modelPath: this.modelPath };
		const worker = new Worker(path.join(__dirname, 'depth-worker.js'), { workerData: setup });
		worker.on('message', (response: DepthWorkerResponse) => {
			const reply = this.replies.get(response.id);
			if (!reply) return;
			this.replies.delete(response.id);
			if (response.png) reply.resolve(Buffer.from(response.png));
			else reply.reject(new Error(response.error));
		});
		const service = this;
		function gone(error: Error): void {
			if (service.worker === worker) service.worker = null;
			for (const reply of service.replies.values()) reply.reject(error);
			service.replies.clear();
		}
		worker.on('error', gone);
		worker.on('exit', (code) => gone(new Error(`the ${DEPTH_MODEL} thread ended (${code})`)));
		this.worker = worker;
		return worker;
	}

	private idle(): void {
		if (this.replies.size > 0 || !this.worker) return;
		if (this.idleTimer) clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			const worker = this.worker;
			this.worker = null;
			this.idleTimer = null;
			if (worker) worker.terminate().catch(() => undefined);
		}, this.idleMs);
		this.idleTimer.unref();
	}
}

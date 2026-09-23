import {
	BannerWorkCancelled,
	type BannerBlendJob,
	type BannerBlendProgress,
	type BannerProtection,
	type BannerSubjectMask
} from '../../domain/appearance/banner-blend';
import type { BannerImages, BannerRenderer } from '../../engine/ports';
import type { BannerWorkerRequest, BannerWorkerResponse } from './banner-blend.protocol';

type Kind = 'render' | 'preview' | 'mask';
type Request = BannerWorkerRequest extends infer R ? (R extends BannerWorkerRequest ? Omit<R, 'id'> : never) : never;

const RENDER_TIMEOUT_MS = 120000;
const MASK_TIMEOUT_MS = 60000;

/**
 * The main-thread binding to BannerBlendWorker. Each request runs in a fresh worker;
 * starting work of a kind already running terminates the older worker.
 */
export class BannerBlendWorkerClient implements BannerRenderer {
	private readonly running: Partial<Record<Kind, () => void>> = {};
	private nextId = 1;

	async render(
		job: BannerBlendJob,
		onProgress?: (progress: BannerBlendProgress) => void
	): Promise<{ images: BannerImages; timings: Record<string, number> }> {
		const result = await this.run<Extract<BannerWorkerResponse, { images: unknown }>>('render', { kind: 'generate', job }, onProgress, RENDER_TIMEOUT_MS);
		return { images: result.images, timings: result.timings };
	}

	/** An unsaved render, returned as data URLs. */
	async preview(job: BannerBlendJob): Promise<BannerImages> {
		const result = await this.run<Extract<BannerWorkerResponse, { images: unknown }>>('preview', { kind: 'generate', job }, undefined, RENDER_TIMEOUT_MS);
		function url(data: string) {
			return `data:image/png;base64,${data}`;
		}
		return { desktop: url(result.images.desktop), mobile: url(result.images.mobile), tile: url(result.images.tile) };
	}

	async subjectMask(
		src: string,
		protection: BannerProtection,
		feather: number,
		onProgress?: (progress: BannerBlendProgress) => void
	): Promise<BannerSubjectMask & { milliseconds: number }> {
		const result = await this.run<Extract<BannerWorkerResponse, { mask: unknown }>>('mask', { kind: 'mask', src, protection, feather }, onProgress, MASK_TIMEOUT_MS);
		return { width: result.mask.width, height: result.mask.height, alpha: result.mask.alpha, milliseconds: result.timings.total };
	}

	cancel(kind: Kind): void {
		this.running[kind]?.();
	}

	private run<T extends BannerWorkerResponse>(
		kind: Kind,
		request: Request,
		onProgress: ((progress: BannerBlendProgress) => void) | undefined,
		timeoutMs: number
	): Promise<T> {
		this.cancel(kind);
		const running = this.running;
		const id = this.nextId++;
		return new Promise<T>(function (resolve, reject) {
			const worker = new Worker(new URL('./banner-blend.worker.ts', import.meta.url), { type: 'module' });
			function finish() {
				clearTimeout(timeout);
				worker.terminate();
				if (running[kind] === cancel) delete running[kind];
			}
			function cancel() {
				finish();
				reject(new BannerWorkCancelled());
			}
			running[kind] = cancel;
			const timeout = setTimeout(() => {
				finish();
				reject(new Error('Banner rendering timed out. Try a smaller subject selection or try again.'));
			}, timeoutMs);
			worker.onmessage = function (event: MessageEvent<BannerWorkerResponse>) {
				const data = event.data;
				if (data.id !== id) return; // A stale message from an earlier request.
				if ('progress' in data) {
					onProgress?.(data.progress);
					return;
				}
				finish();
				if ('error' in data) reject(new Error(data.error));
				else resolve(data as T);
			};
			worker.onerror = function () {
				finish();
				reject(new Error('Banner rendering is unavailable in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.'));
			};
			const message: BannerWorkerRequest =
				request.kind === 'generate'
					? { kind: 'generate', job: request.job, id }
					: { kind: 'mask', src: request.src, protection: request.protection, feather: request.feather, id };
			worker.postMessage(message);
		});
	}
}

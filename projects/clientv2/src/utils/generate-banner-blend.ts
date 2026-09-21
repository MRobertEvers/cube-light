import { API_URI } from '../config/api-url';
import { DEFAULT_BANNER_CROP } from './banner-crop';
import { configForGeneration, normalizeBannerBlendConfig, type BannerBlendConfig, type BannerBlendJob, type BannerBlendProgress,
	type BannerBlendVariant, type BannerProtection, type BannerSubjectMask } from './banner-blend';
import type { BannerCrop } from './banner-crop';
import type { BannerWorkerRequest, BannerWorkerResponse } from './banner-blend.worker';
import type { FetchAPIDeckResponse } from '../api/fetch-api-deck';

/** Thrown when newer work replaces a job; callers should leave the newer job's status alone. */
export class BannerBlendCancelled extends Error {
	constructor() { super('Replaced by a newer banner request.'); this.name = 'BannerBlendCancelled'; }
}

type Running = { cancel: () => void };
type WorkerRequest = BannerWorkerRequest extends infer R ? R extends BannerWorkerRequest ? Omit<R, 'id'> : never : never;
type Slot = 'generate' | 'preview' | 'mask';
const running: Partial<Record<Slot, Running>> = {};
let nextId = 1;

function runWorker<T extends BannerWorkerResponse>(slot: Slot, request: WorkerRequest,
	onProgress: ((progress: BannerBlendProgress) => void) | undefined, timeoutMs: number): Promise<T> {
	// Starting new work of the same kind terminates the obsolete worker immediately.
	running[slot]?.cancel();
	const id = nextId++;
	return new Promise<T>((resolve, reject) => {
		const worker = new Worker(new URL('./banner-blend.worker.ts', import.meta.url), { type: 'module' });
		const finish = () => { window.clearTimeout(timeout); worker.terminate(); if (running[slot] === entry) delete running[slot]; };
		const entry: Running = { cancel: () => { finish(); reject(new BannerBlendCancelled()); } };
		running[slot] = entry;
		const timeout = window.setTimeout(() => { finish(); reject(new Error('Banner rendering timed out. Try a smaller subject selection or try again.')); }, timeoutMs);
		worker.onmessage = (event: MessageEvent<BannerWorkerResponse>) => {
			const data = event.data;
			if (data.id !== id) return; // Stale message from an earlier request.
			if ('progress' in data) { onProgress?.(data.progress); return; }
			finish();
			if ('error' in data) reject(new Error(data.error)); else resolve(data as T);
		};
		worker.onerror = () => { finish(); reject(new Error('Banner rendering is unavailable in this browser. Try a current version of Chrome, Edge, Firefox, or Safari.')); };
		worker.postMessage({ ...request, id } as BannerWorkerRequest);
	});
}

// Deliberately called only by explicit artwork/configuration saves, never by a render effect.
export async function generateAndSaveBannerBlend(deckId: string, deck: FetchAPIDeckResponse,
	config: BannerBlendConfig = normalizeBannerBlendConfig(deck.bannerBlend?.config),
	onProgress?: (message: string, fraction?: number) => void): Promise<void> {
	if (!deck.icon) throw new Error('Choose banner artwork first.');
	const job: BannerBlendJob = { src: deck.icon, crop: deck.bannerCrop ?? DEFAULT_BANNER_CROP, config: configForGeneration(config, deck.icon) };
	onProgress?.('Preparing banner artwork…', 0);
	const started = performance.now();
	const result = await runWorker<Extract<BannerWorkerResponse, { images: unknown }>>('generate', { kind: 'generate', job },
		(progress) => onProgress?.(progress.message, progress.fraction), 120000);
	console.info('Banner blend timings (ms):', { ...result.timings, total: Math.round(performance.now() - started) });
	onProgress?.('Saving generated banners…', 0.97);
	const response = await fetch(`${API_URI}/decks/${deckId}/banner-blend`, {
		method: 'PUT', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ source: deck.icon, crop: job.crop, config: job.config, images: result.images satisfies Record<BannerBlendVariant, string> })
	});
	if (!response.ok) throw new Error(response.status === 409 ? 'The artwork or crop changed while rendering. Please generate again.'
		: response.status === 400 ? 'The server rejected the banner settings. Reset the subject selection and try again.'
			: 'Unable to save the generated banner. Please try again.');
}

/**
 * Unsaved render of a moved crop with the existing blend and subject settings, so the
 * crop editor shows the real result. Returns data URLs; nothing is persisted.
 */
export async function previewBannerBlend(src: string, crop: BannerCrop, config: BannerBlendConfig): Promise<Record<BannerBlendVariant, string>> {
	const job: BannerBlendJob = { src, crop, config: configForGeneration(config, src) };
	const result = await runWorker<Extract<BannerWorkerResponse, { images: unknown }>>('preview', { kind: 'generate', job }, undefined, 120000);
	const url = (data: string) => `data:image/png;base64,${data}`;
	return { desktop: url(result.images.desktop), mobile: url(result.images.mobile), tile: url(result.images.tile) };
}

export function cancelBannerBlendPreview(): void { running.preview?.cancel(); }

/** Explicit, user-requested preview of the protected-subject matte (no persistence). */
export async function previewSubjectMask(src: string, protection: BannerProtection, feather: number,
	onProgress?: (progress: BannerBlendProgress) => void): Promise<BannerSubjectMask & { milliseconds: number }> {
	const result = await runWorker<Extract<BannerWorkerResponse, { mask: unknown }>>('mask', { kind: 'mask', src, protection, feather }, onProgress, 60000);
	return { ...result.mask, milliseconds: result.timings.total };
}

export function cancelSubjectMaskPreview(): void { running.mask?.cancel(); }

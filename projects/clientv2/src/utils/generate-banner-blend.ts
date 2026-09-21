import { API_URI } from '../config/api-url';
import { DEFAULT_BANNER_CROP } from './banner-crop';
import { DEFAULT_BANNER_BLEND, type BannerBlendConfig, type BannerBlendJob, type BannerBlendVariant } from './banner-blend';
import type { FetchAPIDeckResponse } from '../api/fetch-api-deck';

// Deliberately called only by explicit artwork/configuration saves, never by a render effect.
export async function generateAndSaveBannerBlend(deckId: string, deck: FetchAPIDeckResponse,
	config: BannerBlendConfig = deck.bannerBlend?.config ?? DEFAULT_BANNER_BLEND,
	onProgress?: (message: string) => void): Promise<void> {
	if (!deck.icon) throw new Error('Choose banner artwork first.');
	const job: BannerBlendJob = { src: deck.icon, crop: deck.bannerCrop ?? DEFAULT_BANNER_CROP, config };
	onProgress?.('Preparing banner artwork…');
	const images = await new Promise<Record<BannerBlendVariant, string>>((resolve, reject) => {
		const worker = new Worker(new URL('./banner-blend.worker.ts', import.meta.url), { type: 'module' });
		const timeout = window.setTimeout(() => { worker.terminate(); reject(new Error('Banner rendering timed out. Please try again.')); }, 90000);
		const finish = () => { window.clearTimeout(timeout); worker.terminate(); };
		worker.onmessage = (event) => {
			if (event.data.progress) { onProgress?.(event.data.progress); return; }
			finish();
			if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.images);
		};
		worker.onerror = () => { finish(); reject(new Error('Banner rendering is unavailable. Try another browser.')); };
		worker.postMessage(job);
	});
	onProgress?.('Saving generated banners…');
	const response = await fetch(`${API_URI}/decks/${deckId}/banner-blend`, {
		method: 'PUT', headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ source: deck.icon, crop: job.crop, config, images })
	});
	if (!response.ok) throw new Error(response.status === 409 ? 'The artwork or crop changed. Please generate again.' : 'Unable to save the generated banner. Please try again.');
}

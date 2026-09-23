import { DEFAULT_BANNER_CROP, type BannerCrop } from '../../domain/appearance/banner-crop';
import {
	configForGeneration,
	normalizeBannerBlendConfig,
	type BannerBlendConfig,
	type BannerBlendJob,
	type BannerBlendProgress,
	type BannerProtection,
	type BannerSubjectMask
} from '../../domain/appearance/banner-blend';
import type { DeckDetail } from '../../domain/models/deck';
import type { DeckApi } from '../api/decks';
import type { BannerImages, BannerRenderer } from '../ports';

/** Renders deck banners through the BannerRenderer port and saves the result with the deck. */
export class BannerBlending {
	private readonly renderer: BannerRenderer;
	private readonly decks: DeckApi;

	constructor(renderer: BannerRenderer, decks: DeckApi) {
		this.renderer = renderer;
		this.decks = decks;
	}

	/** Renders the deck's banner from its artwork and crop, then saves it. Only explicit saves call this. */
	async renderAndSave(
		deckId: string,
		deck: DeckDetail,
		configArg?: BannerBlendConfig,
		onProgress?: (message: string, fraction?: number) => void
	): Promise<void> {
		const config = configArg === undefined ? normalizeBannerBlendConfig(deck.bannerBlend?.config) : configArg;

		if (!deck.icon) throw new Error('Choose banner artwork first.');
		const job: BannerBlendJob = {
			src: deck.icon,
			crop: deck.bannerCrop ?? DEFAULT_BANNER_CROP,
			config: configForGeneration(config, deck.icon)
		};
		onProgress?.('Preparing banner artwork…', 0);
		const started = performance.now();
		const result = await this.renderer.render(job, (progress) => onProgress?.(progress.message, progress.fraction));
		console.info('Banner blend timings (ms):', Object.assign({}, result.timings, {
			total: Math.round(performance.now() - started)
		}));
		onProgress?.('Saving generated banners…', 0.97);
		await this.decks.saveBannerBlend(deckId, {
			source: deck.icon,
			crop: job.crop,
			config: job.config,
			images: result.images
		});
	}

	/** An unsaved render of a moved crop with the current settings. Returns data URLs. */
	preview(src: string, crop: BannerCrop, config: BannerBlendConfig): Promise<BannerImages> {
		return this.renderer.preview({ src, crop, config: configForGeneration(config, src) });
	}

	cancelPreview(): void {
		this.renderer.cancel('preview');
	}

	/** The protected-subject matte for the artwork, for previewing only. */
	subjectMask(
		src: string,
		protection: BannerProtection,
		feather: number,
		onProgress?: (progress: BannerBlendProgress) => void
	): Promise<BannerSubjectMask & { milliseconds: number }> {
		return this.renderer.subjectMask(src, protection, feather, onProgress);
	}

	cancelSubjectMask(): void {
		this.renderer.cancel('mask');
	}
}

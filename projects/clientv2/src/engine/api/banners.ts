import type { BannerCrop } from '../../domain/appearance/banner-crop';
import {
	configForNewArtwork,
	normalizeBannerBlendConfig,
	type BannerBlendConfig,
	type BannerBlendProgress,
	type BannerProtection,
	type BannerSubjectMask
} from '../../domain/appearance/banner-blend';
import type { BannerBlending } from '../jobs/banner-blending';
import type { BannerImages, DeviceProfile } from '../ports';
import type { DeckApi } from './decks';

export type BannerProgress = (message: string, fraction?: number) => void;

/** A deck's banner: its artwork, its crop, and the blended images rendered from them. */
export class BannersApi {
	private readonly decks: DeckApi;
	private readonly blending: BannerBlending;
	private readonly device: DeviceProfile;

	constructor(decks: DeckApi, blending: BannerBlending, device: DeviceProfile) {
		this.decks = decks;
		this.blending = blending;
		this.device = device;
	}

	/** Shows this printing's artwork in the banner and renders a fresh blend for it. */
	async chooseCard(deckId: string, cardUuid: string, onProgress?: BannerProgress): Promise<void> {
		await this.decks.setBannerCard(deckId, cardUuid);
		const { value: deck } = await this.decks.get(deckId);
		const config = deck.icon
			? configForNewArtwork(normalizeBannerBlendConfig(deck.bannerBlend?.config), deck.icon, this.device.isMobile())
			: undefined;
		await this.blending.renderAndSave(deckId, deck, config, onProgress);
	}

	/** Moves the artwork within the banner and re-renders it with the blend settings in place. */
	async crop(deckId: string, crop: BannerCrop, config: BannerBlendConfig, onProgress?: BannerProgress): Promise<void> {
		await this.decks.setBannerCrop(deckId, crop);
		const { value: deck } = await this.decks.get(deckId);
		if (deck.icon) await this.blending.renderAndSave(deckId, deck, config, onProgress);
	}

	/** Renders and saves the banner with new blend settings. */
	async render(deckId: string, config: BannerBlendConfig, onProgress?: BannerProgress): Promise<void> {
		const { value: deck } = await this.decks.get(deckId);
		await this.blending.renderAndSave(deckId, deck, config, onProgress);
	}

	/** An unsaved render for the crop editor. Newer previews replace older ones. */
	preview(src: string, crop: BannerCrop, config: BannerBlendConfig): Promise<BannerImages> {
		return this.blending.preview(src, crop, config);
	}

	cancelPreview(): void {
		this.blending.cancelPreview();
	}

	subjectMask(
		src: string,
		protection: BannerProtection,
		feather: number,
		onProgress?: (progress: BannerBlendProgress) => void
	): Promise<BannerSubjectMask & { milliseconds: number }> {
		return this.blending.subjectMask(src, protection, feather, onProgress);
	}

	cancelSubjectMask(): void {
		this.blending.cancelSubjectMask();
	}
}

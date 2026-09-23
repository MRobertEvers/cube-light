import { createAppThunk, type AppThunk } from '../thunk';
import type { BoardVisualizationId } from '../../domain/appearance/board-visualization';
import type { CardPalette } from '../../domain/appearance/card-palette';
import type { BannerCrop } from '../../domain/appearance/banner-crop';
import type { DeckTopStyle } from '../../domain/appearance/deck-top-style';
import type {
	BannerBlendConfig,
	BannerBlendProgress,
	BannerBlendVariant,
	BannerProtection,
	BannerSubjectMask
} from '../../domain/appearance/banner-blend';
import { appearanceActions } from './appearanceSettingsSlice';

export const savePalette = createAppThunk(
	'appearanceSettings/savePalette',
	async (args: { deckId: string; palette: CardPalette | null }, context) => {
		const { deckId, palette } = args;
		const { decks } = context.extra;
		await decks.setPalette(deckId, palette);
	}
);

/** Moves the artwork and re-renders the banner with the blend and subject settings in place. */
export const saveCrop = createAppThunk(
	'appearanceSettings/saveCrop',
	async (
		args: { deckId: string; crop: BannerCrop; config: BannerBlendConfig },
		context
	) => {
		const { deckId, crop, config } = args;
		const { dispatch } = context;
		await context.extra.banners.crop(deckId, crop, config, (message, progress) =>
			dispatch(appearanceActions.renderProgress({ deckId, section: 'crop', message, progress }))
		);
	}
);

export const saveBlend = createAppThunk(
	'appearanceSettings/saveBlend',
	async (args: { deckId: string; config: BannerBlendConfig }, context) => {
		const { deckId, config } = args;
		const { dispatch } = context;
		await context.extra.banners.render(deckId, config, (message, progress) =>
			dispatch(appearanceActions.renderProgress({ deckId, section: 'blend', message, progress }))
		);
	}
);

export const saveStyle = createAppThunk(
	'appearanceSettings/saveStyle',
	async (args: { deckId: string; style: DeckTopStyle }, context) => {
		const { deckId, style } = args;
		const { decks } = context.extra;
		await decks.setTopStyle(deckId, style);
	}
);

export const saveVisualization = createAppThunk(
	'appearanceSettings/saveVisualization',
	async (
		args: { deckId: string; visualization: BoardVisualizationId },
		context
	) => {
		const { deckId, visualization } = args;
		const { decks } = context.extra;
		await decks.setBoardVisualization(deckId, visualization);
	}
);

/** An unsaved render for the crop editor, as data URLs. Newer previews cancel older ones. */
export function previewBannerBlend(
	src: string,
	crop: BannerCrop,
	config: BannerBlendConfig
): AppThunk<Promise<Record<BannerBlendVariant, string>>> {
	return function (_dispatch, _getState, engine) {
		return engine.banners.preview(src, crop, config);
	};
}

export function cancelBannerBlendPreview(): AppThunk<void> {
	return function (_dispatch, _getState, engine) {
		return engine.banners.cancelPreview();
	};
}

/** The protected-subject matte for the artwork, for previewing only. */
export function previewSubjectMask(
	src: string,
	protection: BannerProtection,
	feather: number,
	onProgress?: (progress: BannerBlendProgress) => void
): AppThunk<Promise<BannerSubjectMask & { milliseconds: number }>> {
	return function (_dispatch, _getState, engine) {
		return engine.banners.subjectMask(src, protection, feather, onProgress);
	};
}

export function cancelSubjectMaskPreview(): AppThunk<void> {
	return function (_dispatch, _getState, engine) {
		return engine.banners.cancelSubjectMask();
	};
}

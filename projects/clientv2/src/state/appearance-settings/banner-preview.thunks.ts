import type { BannerCrop } from '../../domain/appearance/banner-crop';
import type {
	BannerBlendConfig,
	BannerBlendProgress,
	BannerBlendVariant,
	BannerProtection,
	BannerSubjectMask
} from '../../domain/appearance/banner-blend';
import type { AppThunk } from '../thunk';

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

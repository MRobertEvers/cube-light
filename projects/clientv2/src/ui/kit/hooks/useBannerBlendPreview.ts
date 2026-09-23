import { useEffect, useState } from 'react';
import type { BannerCrop } from '../../../domain/appearance/banner-crop';
import {
	BannerWorkCancelled,
	type BannerBlendConfig,
	type BannerBlendVariant
} from '../../../domain/appearance/banner-blend';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { cancelBannerBlendPreview, previewBannerBlend } from '../../../redux/appearance-settings/appearance-settings.thunks';

type Rendered = { key: string; images: Record<BannerBlendVariant, string> };
type PreviewError = { key: string; message: string };

const PREVIEW_DELAY_MS = 350;

/**
 * Re-renders the blend after the art is moved, once dragging settles, using the existing
 * blend and subject settings. Images are returned only while they match the current crop.
 */
export function useBannerBlendPreview(
	src: string | null,
	crop: BannerCrop,
	config: BannerBlendConfig,
	enabled: boolean
) {
	const [rendered, setRendered] = useState<Rendered | null>(null);
	const [failure, setFailure] = useState<PreviewError | null>(null);
	const key = JSON.stringify([src, crop, config]);
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (!enabled || !src) return;
		let active = true;
		const timer = window.setTimeout(() => {
			dispatch(previewBannerBlend(src, crop, config))
				.then((images) => {
					if (active) setRendered({ key, images });
				})
				.catch((reason) => {
					if (active && !(reason instanceof BannerWorkCancelled))
						setFailure({
							key,
							message:
								reason instanceof Error
									? reason.message
									: String(reason)
						});
				});
		}, PREVIEW_DELAY_MS);
		return function () {
			active = false;
			window.clearTimeout(timer);
			dispatch(cancelBannerBlendPreview());
		};
	}, [dispatch, enabled, key]); // The key captures src, crop and config by value.

	const current = enabled && rendered?.key === key ? rendered.images : null;
	const error = enabled && failure?.key === key ? failure.message : null;
	return {
		images: current,
		rendering: enabled && !!src && !current && !error,
		error: enabled ? error : null
	};
}

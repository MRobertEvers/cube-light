import { useEffect, useState } from 'react';
import type { BannerCrop } from '../utils/banner-crop';
import type {
	BannerBlendConfig,
	BannerBlendVariant
} from '../utils/banner-blend';
import {
	BannerBlendCancelled,
	cancelBannerBlendPreview,
	previewBannerBlend
} from '../utils/generate-banner-blend';

type Rendered = { key: string; images: Record<BannerBlendVariant, string> };

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
	const [error, setError] = useState<string | null>(null);
	const key = JSON.stringify([src, crop, config]);

	useEffect(() => {
		if (!enabled || !src) return;
		setError(null);
		let active = true;
		const timer = window.setTimeout(() => {
			previewBannerBlend(src, crop, config)
				.then((images) => {
					if (active) setRendered({ key, images });
				})
				.catch((reason) => {
					if (active && !(reason instanceof BannerBlendCancelled))
						setError(
							reason instanceof Error
								? reason.message
								: String(reason)
						);
				});
		}, PREVIEW_DELAY_MS);
		return function () {
			active = false;
			window.clearTimeout(timer);
			cancelBannerBlendPreview();
		};
	}, [enabled, key]); // The key captures src, crop and config by value.

	const current = enabled && rendered?.key === key ? rendered.images : null;
	return {
		images: current,
		rendering: enabled && !!src && !current && !error,
		error: enabled ? error : null
	};
}

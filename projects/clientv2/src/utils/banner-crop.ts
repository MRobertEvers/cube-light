export type BannerFrame = { x: number; y: number; zoom: number };
export type BannerCrop = { desktop: BannerFrame; mobile: BannerFrame };

// The masked SpotlightCard edge hides this extra 12% of leftward travel.
export const MAX_MASKED_BANNER_X = 1.12;

export const DEFAULT_BANNER_CROP: BannerCrop = {
	desktop: { x: 0.5, y: 0.5, zoom: 1 },
	mobile: { x: 0.5, y: 0.5, zoom: 1 }
};

export function clamp(value: number, min = 0, max = 1): number {
	return Math.min(max, Math.max(min, value));
}

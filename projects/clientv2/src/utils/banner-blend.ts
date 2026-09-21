import type { BannerCrop } from './banner-crop';

export type BannerBlendConfig = {
	method: 'multiband' | 'poisson' | 'fade';
	contentAware: boolean;
	position: number;
	width: number;
	surface: string;
};
export type BannerBlendVariant = 'desktop' | 'mobile' | 'tile';
export type BannerBlend = { config: BannerBlendConfig; images: Record<BannerBlendVariant, string> | null };
export type BannerBlendJob = { src: string; crop: BannerCrop; config: BannerBlendConfig };
export const DEFAULT_BANNER_BLEND: BannerBlendConfig = {
	method: 'multiband', contentAware: true, position: 0.5, width: 0.18, surface: '#f2e9e6'
};
// Fixed output sizes keep the persisted result independent of viewport and DPR.
export const BANNER_BLEND_SIZES = { desktop: [1440, 224], mobile: [720, 224], tile: [640, 224] } as const;

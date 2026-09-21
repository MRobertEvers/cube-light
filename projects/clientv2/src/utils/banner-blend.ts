import type { BannerCrop } from './banner-crop';

// Bump whenever the pixel pipeline changes. It is saved in the config, hashed into the
// persisted revision, and therefore part of every generated image URL.
export const BANNER_BLEND_ALGORITHM_VERSION = 2;

// Normalized [0, 1] coordinates in the *source artwork* (not a crop), so one selection
// serves the desktop, mobile, and tile crops. Brush radius is a fraction of source width.
export type BannerProtectRect = { x: number; y: number; width: number; height: number };
export type BannerProtectStroke = { label: 'foreground' | 'background'; radius: number; points: number[] };
export type BannerProtection = { source: string; rect: BannerProtectRect | null; strokes: BannerProtectStroke[] };

export type BannerBlendConfig = {
	version: number;
	method: 'multiband' | 'poisson' | 'fade';
	contentAware: boolean;
	position: number;
	width: number;
	surface: string;
	protectSubject: boolean;
	protection: BannerProtection | null;
	/** Guided-filter radius in source pixels. */
	feather: number;
	/** 0 keeps contaminated edge colors, 1 fully replaces the estimated original background. */
	decontamination: number;
};
export type BannerBlendVariant = 'desktop' | 'mobile' | 'tile';
export type BannerBlend = { config: BannerBlendConfig; images: Record<BannerBlendVariant, string> | null };
export type BannerBlendJob = { src: string; crop: BannerCrop; config: BannerBlendConfig };
export type BannerSubjectMask = { width: number; height: number; alpha: Uint8ClampedArray };
export type BannerBlendProgress = { message: string; fraction: number };
export type BannerBlendTimings = Record<string, number>;

export const DEFAULT_BANNER_BLEND: BannerBlendConfig = {
	version: BANNER_BLEND_ALGORITHM_VERSION,
	method: 'multiband', contentAware: true, position: 0.5, width: 0.18, surface: '#f2e9e6',
	protectSubject: false, protection: null, feather: 4, decontamination: 0.9
};
/** Starting subject area for a new selection: the centre of the art, where characters usually are. */
export const DEFAULT_PROTECT_RECT: BannerProtectRect = { x: 0.15, y: 0.05, width: 0.7, height: 0.9 };

export function defaultSubjectProtection(src: string): BannerProtection {
	return { source: src, rect: { ...DEFAULT_PROTECT_RECT }, strokes: [] };
}

/**
 * Config for freshly chosen artwork. Subject protection starts on with the default
 * selection, except on phones and tablets, where segmentation is too slow to run by default.
 */
export function configForNewArtwork(config: BannerBlendConfig, src: string, mobile: boolean): BannerBlendConfig {
	return mobile ? { ...config, protectSubject: false, protection: null }
		: { ...config, protectSubject: true, protection: defaultSubjectProtection(src) };
}

// Fixed output sizes keep the persisted result independent of viewport and DPR.
export const BANNER_BLEND_SIZES = { desktop: [1440, 224], mobile: [720, 224], tile: [640, 224] } as const;
export const MAX_PROTECT_STROKES = 64;
export const MAX_PROTECT_STROKE_POINTS = 512;

/** Compares artwork URLs by path so a different API host does not orphan a selection. */
export function artworkKey(src: string): string {
	try { return new URL(src, 'http://local').pathname; } catch { return src; }
}

export function hasProtection(config: BannerBlendConfig, src: string | null): boolean {
	const { protection } = config;
	return config.protectSubject && !!src && !!protection && artworkKey(protection.source) === artworkKey(src) &&
		(!!protection.rect || protection.strokes.some((stroke) => stroke.label === 'foreground'));
}

/**
 * Migrates saved configurations. Version 1 configs had only the first five fields; they
 * keep their saved images and version until the user explicitly generates again.
 */
export function normalizeBannerBlendConfig(raw: Partial<BannerBlendConfig> | null | undefined): BannerBlendConfig {
	return { ...DEFAULT_BANNER_BLEND, ...raw, version: raw?.version ?? 1, protection: raw?.protection ?? null };
}

/** The config that a new, explicit generation will save. */
export function configForGeneration(config: BannerBlendConfig, src: string): BannerBlendConfig {
	const protection = config.protection && artworkKey(config.protection.source) === artworkKey(src) ? config.protection : null;
	return { ...config, version: BANNER_BLEND_ALGORITHM_VERSION, protection };
}

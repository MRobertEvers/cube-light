import type { ImageMeta } from '@torimtg/core';

/**
 * What a cache holds of an image, without reading it: `claimed` means another process is
 * making it now (wait for it), `failed` that making it failed within the retry window asked about.
 */
export type ImageState = 'absent' | 'present' | 'claimed' | 'failed';

/**
 * Stored card images and their measurements. Keys look like `art_crop/<scryfall id>`.
 *
 * Several processes may share one cache, so an image is made by whoever claims it: look it up,
 * claim it, download it, then `set` it (or `fail`, or `release`). The others see it `claimed`
 * meanwhile and wait for it rather than downloading it again.
 */
export interface ImageCache {
	/** The image, or null when there is none (a file gone missing is forgotten). */
	get(key: string): Promise<Buffer | null>;
	/** Stores the image in place of any other, ending a claim on it. */
	set(key: string, image: Buffer): Promise<void>;
	getMeta(key: string): Promise<ImageMeta | null>;
	setMeta(key: string, meta: ImageMeta): Promise<void>;

	lookup(key: string, retrySeconds: number): Promise<ImageState>;
	/** Whether this cache may make the image: it is not stored and nobody else is making it. */
	claim(key: string, leaseSeconds: number): Promise<boolean>;
	/** Gives up a claim without an outcome. */
	release(key: string): Promise<void>;
	/** Making the image failed: `lookup` reports it failed for a while, and the claim ends. */
	fail(key: string, error: string): Promise<void>;
}

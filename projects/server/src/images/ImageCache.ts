import type { ImageMeta } from '@torimtg/core';

/**
 * Stored card images, each with an optional metadata sidecar. Keys look like
 * `art_crop/<scryfall id>`; the store adds its own extensions.
 */
export interface ImageCache {
	get(key: string): Promise<Buffer | null>;
	set(key: string, image: Buffer): Promise<void>;
	getMeta(key: string): Promise<ImageMeta | null>;
	setMeta(key: string, meta: ImageMeta): Promise<void>;
}

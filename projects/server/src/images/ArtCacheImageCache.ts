import { promises as fs } from 'fs';
import { IMAGE_META_VERSION, type ImageMeta } from '@torimtg/core';
import {
	artcache,
	nowSeconds,
	type ArtCacheHandle,
	type ArtCacheKind
} from './artcache';
import type { ImageCache, ImageState } from './ImageCache';

const KEY =
	/^(small|normal|large|art_crop)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:-back)?)$/;
/** Where an image's measurements live in this machine's index. */
const META_KEY = 'cubelight.meta';

export interface ArtCacheImageCacheOptions {
	/** This machine's index of the folder; null or omitted: artcache's default. */
	index?: string | null;
	/** The clock in whole seconds (tests move it). */
	now?: () => number;
}

/**
 * Card images in the shared art cache (3rd/artcache/FORMAT.md): `<root>/<variant>/<id>.jpg`, a
 * folder torimtgd and other machines may fill too. Measurements are kept in this machine's index,
 * not beside the image, so each machine measures an image once for itself.
 */
export class ArtCacheImageCache implements ImageCache {
	private readonly cache: ArtCacheHandle;
	private readonly now: () => number;

	constructor(root: string, options?: ArtCacheImageCacheOptions) {
		const { index = null, now = nowSeconds } =
			options === undefined ? {} : options;
		this.cache = artcache.open(root, index);
		this.now = now;
	}

	/** The folder, '/' separated. */
	get root(): string {
		return this.cache.root();
	}

	get indexPath(): string {
		return this.cache.indexPath();
	}

	/** Gives up this cache's claims and closes its index. */
	close(): void {
		this.cache.close();
	}

	async get(key: string): Promise<Buffer | null> {
		const { kind, name } = parseKey(key);
		const state = this.cache.lookup(kind, name, null, 0, this.now());
		if (state !== 'present' && state !== 'stale') return null;
		try {
			return await fs.readFile(this.filePath(kind, name));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			// Deleted behind the index's back: the next lookup looks in the folder again.
			this.cache.forget(kind, name);
			return null;
		}
	}

	/** Writes beside the image and renames it into place, so no reader sees half a file. */
	async set(key: string, image: Buffer): Promise<void> {
		const { kind, name } = parseKey(key);
		const temporary = this.cache.tempPath(kind, name);
		if (!temporary) throw new Error(`No place in the art cache for ${key}`);
		try {
			await fs.writeFile(temporary, image);
		} catch (error) {
			await fs.unlink(temporary).catch(() => undefined);
			throw error;
		}
		if (!this.cache.commit(kind, name, temporary, null, this.now())) {
			throw new Error(`Unable to put ${key} in the art cache`);
		}
	}

	async getMeta(key: string): Promise<ImageMeta | null> {
		const { kind, name } = parseKey(key);
		const stored = this.cache.infoGet(kind, name, META_KEY);
		if (!stored) return null;
		try {
			const meta = JSON.parse(stored) as ImageMeta;
			// Measurements from an older measurer are taken again.
			return meta.version === IMAGE_META_VERSION ? meta : null;
		} catch {
			return null;
		}
	}

	async setMeta(key: string, meta: ImageMeta): Promise<void> {
		const { kind, name } = parseKey(key);
		if (!this.cache.infoSet(kind, name, META_KEY, JSON.stringify(meta))) {
			throw new Error(`Unable to keep the measurements of ${key}`);
		}
	}

	async lookup(key: string, retrySeconds: number): Promise<ImageState> {
		const { kind, name } = parseKey(key);
		const state = this.cache.lookup(kind, name, null, retrySeconds, this.now());
		// Scryfall's images have no version, so none is stale; kept for completeness.
		return state === 'stale' ? 'present' : state;
	}

	async claim(key: string, leaseSeconds: number): Promise<boolean> {
		const { kind, name } = parseKey(key);
		return this.cache.claim(kind, name, null, leaseSeconds, this.now());
	}

	async release(key: string): Promise<void> {
		const { kind, name } = parseKey(key);
		this.cache.release(kind, name);
	}

	async fail(key: string, error: string): Promise<void> {
		const { kind, name } = parseKey(key);
		this.cache.fail(kind, name, null, null, error, this.now());
	}

	private filePath(kind: ArtCacheKind, name: string): string {
		const file = this.cache.path(kind, name);
		if (!file) throw new Error('Invalid image cache key');
		return file;
	}
}

/** Keys are validated at the storage boundary so callers cannot escape the cache folder. */
function parseKey(key: string): { kind: ArtCacheKind; name: string } {
	const match = KEY.exec(key);
	if (!match) throw new Error('Invalid image cache key');
	return { kind: match[1] as ArtCacheKind, name: match[2] };
}

import type { ImageMeta } from '@torimtg/core';
import type { ImageCache, ImageState } from './ImageCache';
import type { ImageMeasurer } from './image-measurer';

export type ImageVariant = 'small' | 'normal' | 'large' | 'art_crop';
/** Which side of the printed card: a double-faced card (transform, modal) has a back of its own. */
export type CardFace = 'front' | 'back';

/** A failed download is not asked of Scryfall again for an hour (as torimtgd does). */
const RETRY_FAILED_SECONDS = 3600;
/** A download's claim; one that outlives it (a hung process) is taken over. */
const LEASE_SECONDS = 120;
/** How often an image another process here is downloading is looked for, and for how long. */
const WAIT_POLL_MS = 250;
const WAIT_LIMIT_MS = 120_000;

const SCRYFALL_ID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_VARIANTS = new Set<ImageVariant>([
	'small',
	'normal',
	'large',
	'art_crop'
]);

export function isImageVariant(value: string): value is ImageVariant {
	return IMAGE_VARIANTS.has(value as ImageVariant);
}

export function isScryfallId(value: string): boolean {
	return SCRYFALL_ID.test(value);
}

/** An image's name in its address and in the art cache: `<id>` for a front, `<id>-back` for a back. */
export function imageName(id: string, face: CardFace): string {
	return face === 'back' ? `${id.toLowerCase()}-back` : id.toLowerCase();
}

/** The Scryfall id and face an image name stands for, or null for anything else. */
export function parseImageName(name: string): { id: string; face: CardFace } | null {
	const back = name.toLowerCase().endsWith('-back');
	const id = back ? name.slice(0, -'-back'.length) : name;
	return isScryfallId(id) ? { id: id.toLowerCase(), face: back ? 'back' : 'front' } : null;
}

export function cardImagePath(
	id: string | null | undefined,
	variant: ImageVariant,
	face: CardFace = 'front'
): string | null {
	return id && isScryfallId(id)
		? `/images/${variant}/${imageName(id, face)}.jpg`
		: null;
}

export function cardImageUrl(
	baseUrl: string,
	id: string | null | undefined,
	variant: ImageVariant,
	face: CardFace = 'front'
): string | null {
	const imagePath = cardImagePath(id, variant, face);
	return imagePath ? `${baseUrl}${imagePath}` : null;
}

export function localDeckArtUrl(
	baseUrl: string,
	art: string | null
): string | null {
	if (!art) return null;
	if (art.startsWith('/images/')) return `${baseUrl}${art}`;
	try {
		const url = new URL(art);
		if (url.hostname !== 'cards.scryfall.io') return art;
		const match =
			/^\/art_crop\/front\/[0-9a-f]\/[0-9a-f]\/([0-9a-f-]{36})\.jpg$/i.exec(
				url.pathname
			);
		return match ? cardImageUrl(baseUrl, match[1], 'art_crop') : art;
	} catch {
		return art;
	}
}

/**
 * Card images from Scryfall, stored once in the art cache and downloaded by one process at a
 * time: processes on this machine that share the cache wait for each other's downloads. Each
 * image is measured when it is stored, and the measurements are kept for the client to read
 * with a deck.
 */
export class CardImageService {
	private readonly inFlight = new Map<string, Promise<Buffer | null>>();
	private readonly measuring = new Map<string, Promise<ImageMeta | null>>();
	private readonly cache: ImageCache;
	private readonly measurer: ImageMeasurer;
	private readonly fetchImage: typeof fetch;

	constructor(
		cache: ImageCache,
		measurer: ImageMeasurer,
		fetchImageArg?: typeof fetch
	) {
		this.cache = cache;
		this.measurer = measurer;
		this.fetchImage = fetchImageArg === undefined ? fetch : fetchImageArg;
	}

	/** The image, downloading it when no one has; null when Scryfall has none (a single-faced
	 * card has no back). */
	async get(id: string, variant: ImageVariant, face: CardFace = 'front'): Promise<Buffer | null> {
		const key = `${variant}/${imageName(id, face)}`;
		const cached = await this.cache.get(key);
		if (cached) return cached;

		let pending = this.inFlight.get(key);
		if (!pending) {
			pending = this.obtain(id.toLowerCase(), variant, face, key);
			this.inFlight.set(key, pending);
		}
		try {
			return await pending;
		} finally {
			if (this.inFlight.get(key) === pending) this.inFlight.delete(key);
		}
	}

	/**
	 * The image's measurements. Images this machine has not measured (stored by another
	 * machine or before measuring existed), or whose measuring failed, are measured now.
	 * Null when there is no such image or it cannot be decoded.
	 */
	async meta(id: string, variant: ImageVariant, face: CardFace = 'front'): Promise<ImageMeta | null> {
		const key = `${variant}/${imageName(id, face)}`;
		const stored = await this.cache.getMeta(key);
		if (stored) return stored;
		const image = await this.get(id, variant, face);
		if (!image) return null;
		return (await this.cache.getMeta(key)) ?? this.measure(key, id.toLowerCase(), variant, image);
	}

	private measure(
		key: string,
		id: string,
		variant: ImageVariant,
		image: Buffer
	): Promise<ImageMeta | null> {
		let pending = this.measuring.get(key);
		if (!pending) {
			pending = (async () => {
				let meta: ImageMeta;
				try {
					meta = this.measurer.measure(image, { variant, id });
				} catch (error) {
					console.error(`Unable to measure card image ${key}`, error);
					return null;
				}
				await this.cache.setMeta(key, meta);
				return meta;
			})().finally(() => {
				this.measuring.delete(key);
			});
			this.measuring.set(key, pending);
		}
		return pending;
	}

	/**
	 * The image from the cache once whoever is making it has, or downloaded here after claiming
	 * it. Another process on this machine making it is waited for; null when it fails, when it
	 * failed within the hour, or when waiting runs out.
	 */
	private async obtain(
		id: string,
		variant: ImageVariant,
		face: CardFace,
		key: string
	): Promise<Buffer | null> {
		const deadline = Date.now() + WAIT_LIMIT_MS;
		let previous: ImageState | null = null;
		for (;;) {
			const state = await this.cache.lookup(key, RETRY_FAILED_SECONDS);
			if (state === 'failed') return null;
			if (state === 'present') {
				const image = await this.cache.get(key);
				if (image) return image;
				// Gone from the folder: forgotten, so the next lookup sees it absent.
			} else if (state === 'absent') {
				if (await this.cache.claim(key, LEASE_SECONDS)) {
					return this.download(id, variant, face, key);
				}
				// Refused: another process has claimed or made it since the lookup.
			}
			// Waiting on another process, or nothing changed since the last look: pause first.
			if (state === 'claimed' || state === previous) {
				if (Date.now() >= deadline) {
					console.error(`Gave up waiting for card image ${key}`);
					return null;
				}
				await delay(WAIT_POLL_MS);
			}
			previous = state;
		}
	}

	/** Downloads an image this service has claimed, and stores it or records the failure. */
	private async download(
		id: string,
		variant: ImageVariant,
		face: CardFace,
		key: string
	): Promise<Buffer | null> {
		const url = `https://cards.scryfall.io/${variant}/${face}/${id[0]}/${id[1]}/${id}.jpg`;
		let image: Buffer;
		try {
			const response = await this.fetchImage(url, {
				headers: {
					'User-Agent': 'CubeLight/1.0 (card image cache)',
					Accept: 'image/jpeg'
				}
			});
			if (response.status === 404) {
				await this.cache.fail(key, 'Scryfall has no such image (404)');
				return null;
			}
			if (!response.ok)
				throw new Error(
					`Scryfall image request failed: ${response.status}`
				);
			if (
				!response.headers
					.get('content-type')
					?.toLowerCase()
					.startsWith('image/jpeg')
			) {
				throw new Error('Scryfall returned a non-JPEG image response');
			}
			image = Buffer.from(await response.arrayBuffer());
		} catch (error) {
			await this.cache.fail(key, String(error));
			throw error;
		}
		try {
			await this.cache.set(key, image);
		} catch (error) {
			// Scryfall served it; storing it failed, so let the next request try again.
			await this.cache.release(key).catch(() => undefined);
			throw error;
		}
		// Measure while the image is at hand; a failure leaves it to be measured on request.
		await this.measure(key, id, variant, image).catch((error) => {
			console.error(`Unable to keep the measurements of ${key}`, error);
		});
		return image;
	}
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

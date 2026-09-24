import type { ImageMeta } from '@torimtg/core';
import { ImageCache } from './ImageCache';
import type { ImageMeasurer } from './image-measurer';

export type ImageVariant = 'small' | 'normal' | 'large' | 'art_crop';

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

export function cardImagePath(
	id: string | null | undefined,
	variant: ImageVariant
): string | null {
	return id && isScryfallId(id)
		? `/images/${variant}/${id.toLowerCase()}.jpg`
		: null;
}

export function cardImageUrl(
	baseUrl: string,
	id: string | null | undefined,
	variant: ImageVariant
): string | null {
	const imagePath = cardImagePath(id, variant);
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
 * Card images from Scryfall, stored once on disk. Each image is measured when it is
 * stored, and the measurements are kept as a sidecar the client reads with a deck.
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

	async get(id: string, variant: ImageVariant): Promise<Buffer | null> {
		const key = `${variant}/${id.toLowerCase()}`;
		const cached = await this.cache.get(key);
		if (cached) return cached;

		let pending = this.inFlight.get(key);
		if (!pending) {
			pending = this.download(id.toLowerCase(), variant, key);
			this.inFlight.set(key, pending);
		}
		try {
			return await pending;
		} finally {
			if (this.inFlight.get(key) === pending) this.inFlight.delete(key);
		}
	}

	/**
	 * The image's sidecar. Images stored before sidecars existed, or whose measuring
	 * failed, are measured now. Null when there is no such image or it cannot be decoded.
	 */
	async meta(id: string, variant: ImageVariant): Promise<ImageMeta | null> {
		const key = `${variant}/${id.toLowerCase()}`;
		const stored = await this.cache.getMeta(key);
		if (stored) return stored;
		const image = await this.get(id, variant);
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

	private async download(
		id: string,
		variant: ImageVariant,
		key: string
	): Promise<Buffer | null> {
		const url = `https://cards.scryfall.io/${variant}/front/${id[0]}/${id[1]}/${id}.jpg`;
		const response = await this.fetchImage(url, {
			headers: {
				'User-Agent': 'CubeLight/1.0 (card image cache)',
				Accept: 'image/jpeg'
			}
		});
		if (response.status === 404) return null;
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
		const image = Buffer.from(await response.arrayBuffer());
		await this.cache.set(key, image);
		// Measure while the image is at hand; a failure leaves it to be measured on request.
		await this.measure(key, id, variant, image).catch((error) => {
			console.error(`Unable to store the sidecar for ${key}`, error);
		});
		return image;
	}
}

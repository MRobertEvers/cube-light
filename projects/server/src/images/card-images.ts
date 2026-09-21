import { ImageCache } from './ImageCache';

export type ImageVariant = 'small' | 'normal' | 'large' | 'art_crop';

const SCRYFALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_VARIANTS = new Set<ImageVariant>(['small', 'normal', 'large', 'art_crop']);

export function isImageVariant(value: string): value is ImageVariant {
	return IMAGE_VARIANTS.has(value as ImageVariant);
}

export function isScryfallId(value: string): boolean {
	return SCRYFALL_ID.test(value);
}

export function cardImagePath(id: string | null | undefined, variant: ImageVariant): string | null {
	return id && isScryfallId(id) ? `/images/${variant}/${id.toLowerCase()}.jpg` : null;
}

export function cardImageUrl(baseUrl: string, id: string | null | undefined, variant: ImageVariant): string | null {
	const imagePath = cardImagePath(id, variant);
	return imagePath ? `${baseUrl}${imagePath}` : null;
}

export function localDeckArtUrl(baseUrl: string, art: string | null): string | null {
	if (!art) return null;
	if (art.startsWith('/images/')) return `${baseUrl}${art}`;
	try {
		const url = new URL(art);
		if (url.hostname !== 'cards.scryfall.io') return art;
		const match = /^\/art_crop\/front\/[0-9a-f]\/[0-9a-f]\/([0-9a-f-]{36})\.jpg$/i.exec(url.pathname);
		return match ? cardImageUrl(baseUrl, match[1], 'art_crop') : art;
	} catch {
		return art;
	}
}

export class CardImageService {
	private readonly inFlight = new Map<string, Promise<Buffer | null>>();

	constructor(private readonly cache: ImageCache, private readonly fetchImage: typeof fetch = fetch) {}

	async get(id: string, variant: ImageVariant): Promise<Buffer | null> {
		const key = `${variant}/${id.toLowerCase()}.jpg`;
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

	private async download(id: string, variant: ImageVariant, key: string): Promise<Buffer | null> {
		const url = `https://cards.scryfall.io/${variant}/front/${id[0]}/${id[1]}/${id}.jpg`;
		const response = await this.fetchImage(url, {
			headers: { 'User-Agent': 'CubeLight/1.0 (card image cache)', Accept: 'image/jpeg' }
		});
		if (response.status === 404) return null;
		if (!response.ok) throw new Error(`Scryfall image request failed: ${response.status}`);
		if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/jpeg')) {
			throw new Error('Scryfall returned a non-JPEG image response');
		}
		const image = Buffer.from(await response.arrayBuffer());
		await this.cache.set(key, image);
		return image;
	}
}

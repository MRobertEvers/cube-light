import { IMAGE_META_VERSION, base64ToBytes, imageKey, imageRefOf, thumbHashToDataURL } from '@torimtg/core';
import type { ImageMeta, ImageRef, ResourceQuery } from '@torimtg/core';
import type { Dataset } from './types';
import type { ArtworkInfo, DeckArtwork } from '../../domain/appearance/artwork';

/**
 * Image sidecars downloaded to this device, by imageKey, ready to show. Null: the
 * server answered that it has no sidecar for that image, so there is nothing to ask for again.
 */
export type ImageSidecars = Record<string, ArtworkInfo | null>;

/** The resource a sidecar is downloaded as. */
export function sidecarQuery(ref: ImageRef): Extract<ResourceQuery, { type: 'image.meta' }> {
	return { type: 'image.meta', variant: ref.variant, id: ref.id };
}

/**
 * Parses every stored sidecar and decodes its preview. Resources are Blobs, so this is
 * async and cached per revision. A sidecar from an older measurer is left out, so it is
 * downloaded again.
 */
export async function buildImageSidecars(data: Dataset): Promise<ImageSidecars> {
	const sidecars: ImageSidecars = {};
	for (const resource of data.resources) {
		const descriptor = JSON.parse(resource.key) as ResourceQuery;
		if (descriptor.type !== 'image.meta') continue;
		const key = imageKey({ variant: descriptor.variant, id: descriptor.id });
		if (resource.status !== 200) {
			sidecars[key] = null;
			continue;
		}
		const meta = await resource.body
			.text()
			.then((text) => JSON.parse(text) as ImageMeta)
			.catch(() => null);
		if (meta && meta.version !== IMAGE_META_VERSION) continue;
		sidecars[key] = meta ? artworkInfo(meta) : null;
	}
	return sidecars;
}

function artworkInfo(meta: ImageMeta): ArtworkInfo {
	let preview: string | null = null;
	try {
		preview = meta.preview ? thumbHashToDataURL(base64ToBytes(meta.preview)) : null;
	} catch {
		// A damaged preview only costs the stand-in.
	}
	return { width: meta.width, height: meta.height, palette: meta.palette, preview };
}

/** The deck-facing sidecars for these image URLs; URLs without a downloaded answer are left out. */
export function artworkFor(urls: Array<string | null | undefined>, sidecars: ImageSidecars): DeckArtwork {
	const artwork: DeckArtwork = {};
	for (const url of urls) {
		const ref = imageRefOf(url);
		if (!url || !ref) continue;
		const key = imageKey(ref);
		if (!(key in sidecars)) continue;
		artwork[url] = sidecars[key];
	}
	return artwork;
}

/** The images among these URLs that have a sidecar to download and have not been answered yet. */
export function missingSidecars(urls: Array<string | null | undefined>, artwork: DeckArtwork): ImageRef[] {
	const refs: ImageRef[] = [];
	const seen = new Set<string>();
	for (const url of urls) {
		const ref = imageRefOf(url);
		if (!url || !ref || url in artwork) continue;
		const key = imageKey(ref);
		if (seen.has(key)) continue;
		seen.add(key);
		refs.push(ref);
	}
	return refs;
}

/** The images a deck shows before its card list: its icon, its banner card, and its first card with art. */
export function deckArtworkUrls(deck: { icon: string | null; bannerCard: { art: string | null } | null; cards: Array<{ art?: string | null }> }): string[] {
	const urls: string[] = [];
	if (deck.icon) urls.push(deck.icon);
	if (deck.bannerCard?.art) urls.push(deck.bannerCard.art);
	const first = deck.cards.find((card) => !!card.art);
	if (first?.art) urls.push(first.art);
	return urls;
}

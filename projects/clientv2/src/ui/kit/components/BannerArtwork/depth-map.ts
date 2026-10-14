/**
 * The height map of an art crop the server serves: `/images/depth/<id>.png` beside
 * `/images/art_crop/<id>.jpg` (projects/server/src/routes/depth-maps.ts). The server makes a map
 * on request; while it does, it answers 503 with Retry-After, and 404 when there is none to be had.
 */

const ART_CROP = /^(.*\/images)\/art_crop\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;
const CARD_IMAGE = /\/images\/(?:small|normal|large|art_crop)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;
/** How long to keep asking while the server makes a map (its model loads on the first). */
const GIVE_UP_MS = 60000;

/** The height map's address for this server's art crop address, or null for any other image
 * (Scryfall's, an offline pack's): only the server that serves the art makes its map. A relative
 * address is read against `base` (omitted: the page's). */
export function depthMapUrl(artSrc: string | null, base?: string): string | null {
	const baseUrl = base === undefined ? window.location.href : base;
	if (!artSrc) return null;
	let url: URL;
	try {
		url = new URL(artSrc, baseUrl);
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	const match = ART_CROP.exec(url.pathname);
	if (!match) return null;
	url.pathname = `${match[1]}/depth/${match[2].toLowerCase()}.png`;
	url.search = '';
	return url.toString();
}

/** The art crop of this server's card image of any size (`/images/normal/<id>.jpg` and the like), in
 * the same form (relative or not), or null for any other image. */
export function artCropUrl(imageSrc: string | null | undefined): string | null {
	if (!imageSrc) return null;
	const path = imageSrc.split(/[?#]/)[0];
	const match = CARD_IMAGE.exec(path);
	if (!match) return null;
	return `${path.slice(0, match.index)}/images/art_crop/${match[1].toLowerCase()}.jpg`;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, milliseconds);
		signal.addEventListener('abort', () => {
			clearTimeout(timer);
			reject(new DOMException('Aborted', 'AbortError'));
		});
	});
}

/** An image decoded with its bytes as they are (the map's are heights, not colours). */
async function decode(blob: Blob): Promise<ImageBitmap> {
	return createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
}

/** The map, once the server has it; null when it will not (404, an error, or too long a wait). */
export async function loadDepthMap(url: string, signal: AbortSignal): Promise<ImageBitmap | null> {
	const giveUp = Date.now() + GIVE_UP_MS;
	for (;;) {
		let response: Response;
		try {
			response = await fetch(url, { signal, credentials: 'omit' });
		} catch (error) {
			if (signal.aborted) throw error;
			return null;
		}
		if (response.ok) return decode(await response.blob());
		if (response.status !== 503 || Date.now() >= giveUp) return null;
		const after = Number(response.headers.get('Retry-After'));
		await wait(Math.min(Math.max(Number.isFinite(after) ? after : 3, 1), 10) * 1000, signal);
	}
}

/** The art itself, decoded for the GPU (the same address the page's image has, so it comes from cache). */
export async function loadArt(url: string, signal: AbortSignal): Promise<ImageBitmap | null> {
	try {
		const response = await fetch(url, { signal, credentials: 'omit' });
		if (!response.ok) return null;
		return await createImageBitmap(await response.blob(), { premultiplyAlpha: 'none' });
	} catch (error) {
		if (signal.aborted) throw error;
		return null;
	}
}

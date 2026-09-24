import type { Palette } from './types.js';
import { bytesToBase64, rgbaToThumbHash } from './thumbhash.js';

/**
 * Card images and what the browser needs to know about one before it loads: its
 * size, so it can be placed without waiting, and the page palette drawn from it.
 * The server measures an image when it stores it and serves this as a sidecar.
 */

export type ImageVariant = 'small' | 'normal' | 'large' | 'art_crop';
export const IMAGE_VARIANTS: readonly ImageVariant[] = ['small', 'normal', 'large', 'art_crop'];

/** One stored card image: its variant and its Scryfall id, lowercase. */
export type ImageRef = { variant: ImageVariant; id: string };

/** The sidecar the server records for a stored image. */
export type ImageMeta = {
    version: typeof IMAGE_META_VERSION;
    variant: ImageVariant;
    id: string;
    width: number;
    height: number;
    /** Null when the image has too little color to draw a palette from. */
    palette: Palette | null;
    /** A blurred stand-in for the image as a base64 ThumbHash (about 25 bytes), shown until it loads. */
    preview: string;
};

/** Bumped whenever measuring changes; sidecars of an older version are measured again. */
export const IMAGE_META_VERSION = 2;

/** Images are shrunk to a square this many pixels wide before their palette is drawn. */
export const IMAGE_PALETTE_SAMPLE_SIZE = 40;

/** ThumbHash reads at most 100x100 pixels, in the image's own proportions. */
export function previewSampleSize(width: number, height: number): { width: number; height: number } {
    const scale = 100 / Math.max(width, height, 100);
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** The base64 ThumbHash of an RGBA sample sized by previewSampleSize. */
export function previewFromPixels(width: number, height: number, pixels: ArrayLike<number>): string {
    return bytesToBase64(rgbaToThumbHash(width, height, pixels));
}

const SCRYFALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isImageVariant(value: string): value is ImageVariant {
    return (IMAGE_VARIANTS as readonly string[]).includes(value);
}

export function isScryfallId(value: string): boolean {
    return SCRYFALL_ID.test(value);
}

/**
 * Which stored image a URL shows, whoever serves it: this server's
 * `/images/<variant>/<id>.jpg`, a CDN in front of it, or Scryfall's
 * `/<variant>/front/<a>/<b>/<id>.jpg`. Null for anything else.
 */
export function imageRefOf(url: string | null | undefined): ImageRef | null {
    if (!url) return null;
    let pathname = url;
    try { pathname = new URL(url, 'http://local').pathname; } catch { return null; }
    const match = /\/(small|normal|large|art_crop)\/(?:front\/[0-9a-f]\/[0-9a-f]\/)?([0-9a-f-]{36})\.jpg$/i.exec(pathname);
    if (!match || !isImageVariant(match[1]) || !isScryfallId(match[2])) return null;
    return { variant: match[1], id: match[2].toLowerCase() };
}

/** A stable name for an image, used to look up its sidecar. */
export function imageKey(ref: ImageRef): string {
    return `${ref.variant}/${ref.id}`;
}

function rgbToHsl(red: number, green: number, blue: number) {
    const r = red / 255;
    const g = green / 255;
    const b = blue / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const difference = max - min;
    const lightness = (max + min) / 2;
    if (difference === 0) return { hue: 0, saturation: 0, lightness };

    const saturation = difference / (1 - Math.abs(2 * lightness - 1));
    let hue = 0;
    if (max === r) hue = ((g - b) / difference) % 6;
    else if (max === g) hue = (b - r) / difference + 2;
    else hue = (r - g) / difference + 4;
    return { hue: (hue * 60 + 360) % 360, saturation, lightness };
}

function hslColor(hue: number, saturation: number, lightness: number) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const section = hue / 60;
    const secondary = chroma * (1 - Math.abs((section % 2) - 1));
    const match = lightness - chroma / 2;
    const channels =
        section < 1
            ? [chroma, secondary, 0]
            : section < 2
                ? [secondary, chroma, 0]
                : section < 3
                    ? [0, chroma, secondary]
                    : section < 4
                        ? [0, secondary, chroma]
                        : section < 5
                            ? [secondary, 0, chroma]
                            : [chroma, 0, secondary];
    return `#${channels
        .map((channel) =>
            Math.round((channel + match) * 255)
                .toString(16)
                .padStart(2, '0')
        )
        .join('')}`;
}

function accentContrast(hue: number, saturation: number, lightness: number) {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const section = hue / 60;
    const secondary = chroma * (1 - Math.abs((section % 2) - 1));
    const match = lightness - chroma / 2;
    const channels =
        section < 1
            ? [chroma, secondary, 0]
            : section < 2
                ? [secondary, chroma, 0]
                : section < 3
                    ? [0, chroma, secondary]
                    : section < 4
                        ? [0, secondary, chroma]
                        : section < 5
                            ? [secondary, 0, chroma]
                            : [chroma, 0, secondary];
    const luminance = channels.reduce((sum, channel, index) => {
        const value = channel + match;
        const linear =
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    return 1.05 / (luminance + 0.05);
}

/**
 * Draws a page palette from an image's RGBA pixels, usually a square sample of
 * IMAGE_PALETTE_SAMPLE_SIZE. Returns null when too few pixels are colorful.
 */
export function paletteFromPixels(pixels: ArrayLike<number>): Palette | null {
    const pixelCount = Math.floor(pixels.length / 4);
    const HUE_BUCKETS = 24;
    const buckets = Array.from({ length: HUE_BUCKETS }, () => ({
        weight: 0,
        count: 0,
        x: 0,
        y: 0,
        saturation: 0,
        lightness: 0
    }));
    for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] < 128) continue;
        const { hue, saturation, lightness } = rgbToHsl(
            pixels[index],
            pixels[index + 1],
            pixels[index + 2]
        );
        if (saturation < 0.16 || lightness < 0.1 || lightness > 0.9)
            continue;
        const weight = saturation * (1 - 0.65 * Math.abs(lightness - 0.5));
        const bucket = buckets[Math.floor(hue / (360 / HUE_BUCKETS))];
        const angle = (hue * Math.PI) / 180;
        bucket.weight += weight;
        bucket.count++;
        bucket.x += Math.cos(angle) * weight;
        bucket.y += Math.sin(angle) * weight;
        bucket.saturation += saturation * weight;
        bucket.lightness += lightness * weight;
    }

    function windowWeight(index: number) {
        return [-1, 0, 1].reduce(
            (sum, offset) =>
                sum +
                buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS]
                    .weight,
            0
        );
    }
    function windowCount(index: number) {
        return [-1, 0, 1].reduce(
            (sum, offset) =>
                sum +
                buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS].count,
            0
        );
    }
    let best = -1;
    let bestWeight = 0;
    for (let index = 0; index < HUE_BUCKETS; index++) {
        const weight = windowWeight(index);
        if (weight > bestWeight) {
            best = index;
            bestWeight = weight;
        }
    }
    if (best < 0) return null;

    function summarize(index: number) {
        const neighbors = [-1, 0, 1].map(
            (offset) =>
                buckets[(index + offset + HUE_BUCKETS) % HUE_BUCKETS]
        );
        const totals = neighbors.reduce(
            (sum, bucket) => ({
                weight: sum.weight + bucket.weight,
                x: sum.x + bucket.x,
                y: sum.y + bucket.y,
                saturation: sum.saturation + bucket.saturation,
                lightness: sum.lightness + bucket.lightness
            }),
            { weight: 0, x: 0, y: 0, saturation: 0, lightness: 0 }
        );
        return {
            hue:
                ((Math.atan2(totals.y, totals.x) * 180) / Math.PI + 360) %
                360,
            saturation: totals.saturation / totals.weight,
            lightness: totals.lightness / totals.weight
        };
    }
    function distanceFromDominant(index: number) {
        return (
            (Math.min(
                Math.abs(index - best),
                HUE_BUCKETS - Math.abs(index - best)
            ) *
                360) /
            HUE_BUCKETS
        );
    }

    // A contrasting accent must also be colorful enough to stand out. Otherwise
    // muted scenery can displace a more characteristic subject color.
    let accentBucket = best;
    let accentWeight = 0;
    for (let index = 0; index < HUE_BUCKETS; index++) {
        const weight = windowWeight(index);
        if (
            distanceFromDominant(index) < 80 ||
            weight < bestWeight * 0.12 ||
            windowCount(index) < pixelCount * 0.025 ||
            summarize(index).saturation < 0.26
        )
            continue;
        if (weight > accentWeight) {
            accentBucket = index;
            accentWeight = weight;
        }
    }

    // When the accent is the dominant hue, use a separate substantial hue for
    // the quieter surfaces. This keeps multi-colored artwork from becoming monochrome.
    let surfaceBucket = best;
    if (accentBucket === best) {
        let surfaceWeight = 0;
        for (let index = 0; index < HUE_BUCKETS; index++) {
            const weight = windowWeight(index);
            if (
                distanceFromDominant(index) < 50 ||
                weight < bestWeight * 0.1 ||
                windowCount(index) < pixelCount * 0.025
            )
                continue;
            if (weight > surfaceWeight) {
                surfaceBucket = index;
                surfaceWeight = weight;
            }
        }
    }
    const accent = summarize(accentBucket);
    const surface = summarize(surfaceBucket);
    const hue = accent.hue;
    const saturation = Math.min(
        0.75,
        Math.max(0.45, accent.saturation * 1.3)
    );
    let accentLightness = Math.min(
        0.42,
        Math.max(0.32, 0.35 + (accent.lightness - 0.4) * 0.15)
    );
    while (accentContrast(hue, saturation, accentLightness) < 5.6)
        accentLightness -= 0.01;

    return {
        accent: hslColor(hue, saturation, accentLightness),
        surface: hslColor(
            surface.hue,
            Math.min(0.5, Math.max(0.22, surface.saturation * 0.9)),
            0.87
        ),
        wash: hslColor(
            surface.hue,
            Math.min(0.32, Math.max(0.14, surface.saturation * 0.65)),
            0.95
        ),
        border: hslColor(
            surface.hue,
            Math.min(0.45, Math.max(0.18, surface.saturation * 0.8)),
            0.76
        )
    };
}

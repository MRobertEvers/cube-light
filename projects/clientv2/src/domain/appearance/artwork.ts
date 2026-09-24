import type { CardPalette } from './card-palette';

/**
 * What the server measured about an image when it stored it: enough to place the
 * image, theme the page, and show a blurred stand-in before the image itself loads.
 */
export type ArtworkInfo = {
	width: number;
	height: number;
	/** Null when the image is too gray to draw a palette from. */
	palette: CardPalette | null;
	/** A tiny blurred PNG (a data URL, so it works offline) to show until the image loads. */
	preview: string | null;
};

/**
 * Sidecars for the images a deck shows, keyed by the image URL exactly as the deck
 * gives it. Null: the server has no sidecar for that image. Absent: not downloaded yet.
 */
export type DeckArtwork = Record<string, ArtworkInfo | null>;

/** The sidecar for one of the deck's images, or null when there is none (yet). */
export function artworkOf(
	artwork: DeckArtwork | undefined,
	src: string | null | undefined
): ArtworkInfo | null {
	if (!artwork || !src) return null;
	return artwork[src] ?? null;
}

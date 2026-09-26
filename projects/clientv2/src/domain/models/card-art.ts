/**
 * The offline card art pack: a small image of each card's art (its default printing),
 * built by the server's card-images.py and installed on a device on request, so card art
 * shows with no server.
 */

/** What the server offers, before download (the server's CardArt.info.json). */
export type CardArtInfo = {
	/** The card data version the art was chosen for. */
	version: string;
	/** The index's format: 2 also maps each card's default printing to its art. */
	format: number;
	/** The art's width in pixels. */
	width: number;
	cards: number;
	/** The whole download's size. */
	bytes: number;
	chunks: number;
	builtAt: string;
	/** The index's sha256, which names this build of the art: it changes whenever any art does. */
	sha256: string;
};

/**
 * The art on this device. `builtAt` and `sha256` are null for art installed before the pack
 * was versioned, which the server's art never matches, so it shows as needing an update.
 */
export type InstalledCardArt = {
	version: string;
	format: number;
	width: number;
	cards: number;
	bytes: number;
	chunks: number;
	builtAt: string | null;
	sha256: string | null;
	installedAt: string;
};

/**
 * The art on this device, what the server offers, and whether this device was already
 * asked if it wants the art.
 * - installed: null when none is installed here.
 * - offered: null when the server cannot be reached or has none.
 */
export type CardArtStatus = {
	installed: InstalledCardArt | null;
	offered: CardArtInfo | null;
	asked: boolean;
};

/** Whether the offered art is another build than the installed art. */
export function cardArtUpdateAvailable(status: CardArtStatus): boolean {
	return status.installed !== null && status.offered !== null && status.offered.sha256 !== status.installed.sha256;
}

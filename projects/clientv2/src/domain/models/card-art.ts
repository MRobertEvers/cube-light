/**
 * The offline card art pack: a small image of each card's art (its default printing),
 * built by the server's card-images.py and installed on a device on request, so card art
 * shows with no server.
 */

/** What the server offers, before download. */
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
};

export type InstalledCardArt = CardArtInfo & { installedAt: string };

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

/** Whether the offered art differs from the installed art, in its cards, its size or its index's format. */
export function cardArtUpdateAvailable(status: CardArtStatus): boolean {
	const installed = status.installed;
	const offered = status.offered;
	if (installed === null || offered === null) return false;
	return offered.version !== installed.version || offered.width !== installed.width || offered.format !== installed.format;
}

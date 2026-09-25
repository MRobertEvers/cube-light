/**
 * The offline card art pack: a small image of each card's art (its default printing),
 * built by the server's card-images.py and installed on a device on request, so card art
 * shows with no server.
 */

/** What the server offers, before download. */
export type CardArtInfo = {
	/** The card data version the art was chosen for. */
	version: string;
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

/** Whether the offered art differs from the installed art. */
export function cardArtUpdateAvailable(status: CardArtStatus): boolean {
	return status.installed !== null && status.offered !== null && status.offered.version !== status.installed.version;
}

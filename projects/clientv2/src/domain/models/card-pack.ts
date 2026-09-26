/**
 * The offline card pack: every card's text, built by the server's refresh-mtgjson.py and
 * installed on a device on request, so card text can be read with no server.
 */

/** What a pack holds, as the server describes it before download. */
export type CardPackInfo = {
	/** The MTGJSON version it was built from. */
	version: string;
	/** The MTGJSON data's date. */
	date: string;
	builtAt: string;
	cards: number;
	/** The compressed download's size. */
	bytes: number;
	sha256: string;
};

export type InstalledCardPack = CardPackInfo & { installedAt: string };

/**
 * The card-name index that name search and list checks read, as the server describes it.
 * Its sha256 names the build; the copy on a device is the one it last downloaded.
 */
export type CardNamesInfo = {
	/** The MTGJSON version it was built from. */
	version: string;
	/** The MTGJSON data's date. */
	date: string;
	builtAt: string;
	names: number;
	bytes: number;
	sha256: string;
};

/**
 * The pack and card-name index on this device and the ones the server offers.
 * - installed: null when no pack is installed here.
 * - offered: null when the server cannot be reached or has none.
 * - namesHere: the sha256 of the name index on this device; null when it has none.
 * - namesOffered: null when the server cannot be reached or has none.
 */
export type CardPackStatus = {
	installed: InstalledCardPack | null;
	offered: CardPackInfo | null;
	namesHere: string | null;
	namesOffered: CardNamesInfo | null;
};

/** One face of a card: most cards have one; split, adventure and double-faced cards two. */
export type PackCardFace = {
	/** The face's own name, for cards with more than one face; null otherwise. */
	name: string | null;
	manaCost: string | null;
	type: string | null;
	text: string | null;
	power: string | null;
	toughness: string | null;
	loyalty: string | null;
	defense: string | null;
};

export type PackCard = {
	name: string;
	faces: PackCardFace[];
	/**
	 * The card's default printing: the one the server picks for its name, so a card added
	 * offline is the same printing it would be online. Null for the few names with no front face.
	 */
	printing: { uuid: string; setCode: string } | null;
};

/** A printing the pack describes: its card's text under the printing's id. */
export type PackPrinting = {
	uuid: string;
	name: string;
	setCode: string;
	faces: PackCardFace[];
};

/** Whether the offered pack differs from the installed one. */
export function cardPackUpdateAvailable(status: CardPackStatus): boolean {
	return status.installed !== null && status.offered !== null && status.offered.sha256 !== status.installed.sha256;
}

/** Whether the installed card data's name index differs from the one the server offers, or is missing. */
export function cardNamesUpdateAvailable(status: CardPackStatus): boolean {
	return status.installed !== null && status.namesOffered !== null && status.namesOffered.sha256 !== status.namesHere;
}

/** Whether the offline card data, its pack or its name index, has an update. */
export function offlineCardDataUpdateAvailable(status: CardPackStatus): boolean {
	return cardPackUpdateAvailable(status) || cardNamesUpdateAvailable(status);
}

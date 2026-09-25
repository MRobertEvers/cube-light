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
 * The pack on this device and the one the server offers.
 * - installed: null when none is installed here.
 * - offered: null when the server cannot be reached or has none.
 */
export type CardPackStatus = {
	installed: InstalledCardPack | null;
	offered: CardPackInfo | null;
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

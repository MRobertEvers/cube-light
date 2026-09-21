import { Database, Deck, DeckCardEdit } from '../database/app/database';
import { CardDatabase } from '../database/cards/CardDatabase';
import { cardImagePath } from '../images/card-images';

export type ImportCardRequest = {
	name: string;
	count: number;
	setCode?: string;
};

type Printing = Awaited<ReturnType<CardDatabase['queryCardsByName']>>[number];

export type ResolvedImport = {
	edits: DeckCardEdit[];
	firstCard: Printing | undefined;
	unknownCards: string[];
};

export function validImportCards(cards: unknown): cards is ImportCardRequest[] {
	return (
		Array.isArray(cards) &&
		cards.length > 0 &&
		cards.length <= 1000 &&
		cards.every(
			(card) =>
				card &&
				typeof card.name === 'string' &&
				card.name.trim() &&
				Number.isInteger(card.count) &&
				card.count > 0 &&
				card.count <= 999 &&
				(card.setCode === undefined || typeof card.setCode === 'string')
		)
	);
}

/** Resolves names (and optional set codes) to printings; the first printing wins without a set. */
export async function resolveImportCards(
	cardDatabase: CardDatabase,
	cards: ImportCardRequest[]
): Promise<ResolvedImport> {
	const edits: DeckCardEdit[] = [];
	let firstCard: Printing | undefined;
	const unknownCards: string[] = [];
	for (const card of cards) {
		const printings = await cardDatabase.queryCardsByName(card.name.trim());
		const setCode = card.setCode?.toUpperCase();
		const found =
			printings.find(
				(printing) => printing.setCode.toUpperCase() === setCode
			) ?? printings[0];
		if (!found) {
			unknownCards.push(card.name);
			continue;
		}
		firstCard ??= found;
		edits.push({ uuid: found.uuid, action: 'add', count: card.count });
	}
	return { edits, firstCard, unknownCards };
}

/** Records the additions as one deck edit, and gives an artless deck its first card's art. */
export async function applyImport(
	database: Database,
	deck: Deck,
	resolved: ResolvedImport
): Promise<number> {
	if (resolved.edits.length === 0) return 0;
	const edit = database.applyDeckCardEdit(
		String(deck.DeckId),
		resolved.edits
	);
	const { firstCard } = resolved;
	if (edit?.cardsIn.length && !deck.Art && firstCard) {
		const art = cardImagePath(firstCard.scryfallId, 'art_crop');
		if (art) await database.setDeckArt(deck.DeckId, art, firstCard.uuid);
	}
	return resolved.edits.reduce((total, edit) => total + edit.count, 0);
}

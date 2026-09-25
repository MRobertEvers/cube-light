import type { DeckCardEntry } from '../models/deck';
import type { OwnedName, Ownership } from '../models/library';

/** Card names are the same card when they match ignoring case and surrounding space. */
export function ownedNameKey(name: string): string {
	return name.trim().toLowerCase();
}

export type OwnershipStatus = 'owned' | 'partial' | 'missing';

/** What a deck needs of one card name, and what the owned collections have of it. */
export type RowOwnership = {
	/** Copies the deck lists, in both boards. */
	need: number;
	/** Copies across owned collections, any printing. */
	owned: number;
	/** Copies other decks list. Decks do not reserve cards, so this only informs. */
	inOtherDecks: number;
	/** Owned copies no other deck lists. */
	free: number;
	/** Copies across wanted collections. */
	wanted: number;
	status: OwnershipStatus;
};

export type DeckOwnershipSummary = {
	/** Copies the deck lists that the owned collections cover. */
	ownedCopies: number;
	/** Copies the deck lists. */
	totalCopies: number;
	/** Names the collections hold some, but not all, copies of. */
	partialNames: number;
	/** Names the collections hold no copies of. */
	missingNames: number;
	/** Copies the deck lists beyond what is owned. */
	missingCopies: number;
};

export function ownershipStatus(owned: number, need: number): OwnershipStatus {
	if (owned >= need) return 'owned';
	return owned > 0 ? 'partial' : 'missing';
}

function othersIn(name: OwnedName | undefined, deckId: string | null): number {
	if (!name) return 0;
	return Object.keys(name.inDecks).filter((id) => id !== deckId).reduce((total, id) => total + name.inDecks[id], 0);
}

/** One card name's ownership, from the point of view of `deckId` (null outside a deck). */
export function rowOwnership(ownership: Ownership, deckId: string | null, name: string, need: number): RowOwnership {
	const entry = ownership.byName[ownedNameKey(name)];
	const owned = entry?.owned ?? 0;
	const inOtherDecks = othersIn(entry, deckId);
	return { need, owned, inOtherDecks, free: Math.max(0, owned - inOtherDecks), wanted: entry?.wanted ?? 0, status: ownershipStatus(owned, need) };
}

/** Copies of each card name a deck lists, across both boards, keyed by `ownedNameKey`. */
export function deckNeeds(cards: readonly DeckCardEntry[]): Map<string, { name: string; need: number; printings: DeckCardEntry[] }> {
	const needs = new Map<string, { name: string; need: number; printings: DeckCardEntry[] }>();
	for (const card of cards) {
		const key = ownedNameKey(card.name);
		const existing = needs.get(key);
		if (existing) {
			existing.need += card.count;
			existing.printings.push(card);
		} else needs.set(key, { name: card.name, need: card.count, printings: [card] });
	}
	return needs;
}

/** Each card name's ownership for a deck, keyed by `ownedNameKey`. */
export function deckOwnership(ownership: Ownership, deckId: string, cards: readonly DeckCardEntry[]): Record<string, RowOwnership> {
	const rows: Record<string, RowOwnership> = {};
	for (const entry of deckNeeds(cards)) rows[entry[0]] = rowOwnership(ownership, deckId, entry[1].name, entry[1].need);
	return rows;
}

export function deckOwnershipSummary(rows: Record<string, RowOwnership>): DeckOwnershipSummary {
	const summary: DeckOwnershipSummary = { ownedCopies: 0, totalCopies: 0, partialNames: 0, missingNames: 0, missingCopies: 0 };
	for (const row of Object.values(rows)) {
		summary.totalCopies += row.need;
		summary.ownedCopies += Math.min(row.need, row.owned);
		summary.missingCopies += Math.max(0, row.need - row.owned);
		if (row.status === 'partial') summary.partialNames++;
		if (row.status === 'missing') summary.missingNames++;
	}
	return summary;
}

/**
 * The copies a deck lists beyond what is owned, one per card name. Each shortfall names the
 * printing the deck lists most, so a wishlist matches the deck.
 */
export function missingForDeck(ownership: Ownership, cards: readonly DeckCardEntry[]): Array<{ uuid: string; name: string; count: number }> {
	const missing: Array<{ uuid: string; name: string; count: number }> = [];
	for (const entry of deckNeeds(cards).values()) {
		const owned = ownership.byName[ownedNameKey(entry.name)]?.owned ?? 0;
		const count = entry.need - owned;
		if (count <= 0) continue;
		const printing = entry.printings.slice().sort((a, b) => b.count - a.count || a.uuid.localeCompare(b.uuid))[0];
		missing.push({ uuid: printing.uuid, name: entry.name, count });
	}
	return missing;
}

/** An owned card name that matches a search, with what a deck could still take of it. */
export type OwnedSuggestion = {
	name: string;
	owned: number;
	free: number;
	wanted: number;
	/** Owned printings, most copies first: `[setCode, copies]`. */
	printings: Array<{ uuid: string; setCode: string; copies: number }>;
	/** Other decks listing the card, most copies first: `[deckId, copies]`. */
	decks: Array<{ deckId: string; copies: number }>;
};

/**
 * Owned card names containing `query`, ignoring case. Names starting with it come first,
 * then those with the most free copies, then by name.
 */
export function suggestOwnedNames(ownership: Ownership, deckId: string | null, query: string, limit: number): OwnedSuggestion[] {
	const search = ownedNameKey(query);
	const matches: Array<{ starts: boolean; suggestion: OwnedSuggestion }> = [];
	for (const entry of Object.values(ownership.byName)) {
		if (entry.owned <= 0) continue;
		const key = ownedNameKey(entry.name);
		const at = key.indexOf(search);
		if (at < 0) continue;
		const row = rowOwnership(ownership, deckId, entry.name, 0);
		matches.push({
			starts: at === 0,
			suggestion: {
				name: entry.name,
				owned: row.owned,
				free: row.free,
				wanted: row.wanted,
				printings: entry.uuids.map((uuid) => ({ uuid, setCode: ownership.byUuid[uuid]?.setCode ?? '', copies: ownership.byUuid[uuid]?.owned ?? 0 })),
				decks: Object.keys(entry.inDecks).filter((id) => id !== deckId).map((id) => ({ deckId: id, copies: entry.inDecks[id] })).sort((a, b) => b.copies - a.copies)
			}
		});
	}
	matches.sort((a, b) => Number(b.starts) - Number(a.starts) || b.suggestion.free - a.suggestion.free || a.suggestion.name.localeCompare(b.suggestion.name));
	return matches.slice(0, limit).map((match) => match.suggestion);
}

/**
 * The owned printing of `name` to add to a deck: the one with the most owned copies, since
 * decks do not reserve particular copies. Null when no printing is owned.
 */
export function ownedPrintingFor(ownership: Ownership, name: string): string | null {
	return ownership.byName[ownedNameKey(name)]?.uuids[0] ?? null;
}

/** Whether any collection owns a card. */
export function ownsAnything(ownership: Ownership): boolean {
	return Object.values(ownership.byName).some((entry) => entry.owned > 0);
}

/** Which of a deck's cards to show, by how much of them is owned. */
export type OwnershipFilter = 'all' | 'owned' | 'missing';

/** The entries whose card name matches `filter`; names without a row count as missing. */
export function filterByOwnership<T extends { name: string }>(cards: readonly T[], rows: Record<string, RowOwnership>, filter: OwnershipFilter): T[] {
	if (filter === 'all') return cards.slice();
	return cards.filter((card) => (rows[ownedNameKey(card.name)]?.status === 'owned') === (filter === 'owned'));
}

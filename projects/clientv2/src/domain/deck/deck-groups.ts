import { deckInGroup, tagKey } from './tags';
import type { DeckGroup, DeckSummary } from '../models/deck';

/** One group's decks as the deck list shows them. */
export type DeckGroupSection = {
	group: DeckGroup;
	decks: DeckSummary[];
};

/** The deck list split into its groups, in group order, and the decks no group holds. */
export type GroupedDeckList = {
	sections: DeckGroupSection[];
	ungrouped: DeckSummary[];
};

/** Every group's decks. A deck appears in each group it matches; decks that match none are ungrouped. */
export function groupDeckList(
	decks: readonly DeckSummary[],
	groups: readonly DeckGroup[]
): GroupedDeckList {
	const grouped = new Set<string>();
	const sections = groups.map((group) => {
		const members = decks.filter((deck) => deckInGroup(deck.tags, group));
		for (const deck of members) grouped.add(deck.deckId);
		return { group, decks: members };
	});
	return {
		sections,
		ungrouped: decks.filter((deck) => !grouped.has(deck.deckId))
	};
}

/** Every tag any deck uses, once each in its first spelling, sorted by name. */
export function knownDeckTags(decks: readonly DeckSummary[]): string[] {
	const tags = new Map<string, string>();
	for (const deck of decks)
		for (const tag of deck.tags ?? [])
			if (!tags.has(tagKey(tag))) tags.set(tagKey(tag), tag);
	return Array.from(tags.values()).sort((a, b) =>
		a.localeCompare(b, undefined, { sensitivity: 'base' })
	);
}

/** How many decks carry each tag, by tag key. */
export function deckTagCounts(decks: readonly DeckSummary[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const deck of decks)
		for (const tag of deck.tags ?? [])
			counts.set(tagKey(tag), (counts.get(tagKey(tag)) ?? 0) + 1);
	return counts;
}

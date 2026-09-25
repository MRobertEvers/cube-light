import type { PlacementMove } from '@torimtg/core';
import type { DeckCardEntry } from '../models/deck';
import type { CollectionDetail, LocationDetail, Placements } from '../models/library';

/** Which of a collection's copies to show: all of them, the unplaced ones, or one location's. */
export type PlacementFilter =
	| { type: 'all' }
	| { type: 'unplaced' }
	| { type: 'location'; locationId: string };

export const ALL_PLACEMENTS: PlacementFilter = { type: 'all' };

function placedOf(stored: Placements, uuid: string): number {
	return Object.values(stored[uuid] ?? {}).reduce((total, count) => total + count, 0);
}

/** Copies of a printing that are in no storage location that still exists. */
export function unplacedOf(collection: Pick<CollectionDetail, 'stored'>, card: { uuid: string; count: number }): number {
	return Math.max(0, card.count - placedOf(collection.stored, card.uuid));
}

/** An entry showing `count` copies instead of the entry's own. */
function withCount(card: DeckCardEntry, count: number): DeckCardEntry {
	const copy = structuredClone(card);
	copy.count = count;
	return copy;
}

/** The collection's entries that `filter` lets through, each counting only the copies it covers. */
export function collectionCardsIn(collection: CollectionDetail, filter: PlacementFilter): DeckCardEntry[] {
	if (filter.type === 'all') return collection.cards;
	const cards: DeckCardEntry[] = [];
	for (const card of collection.cards) {
		const count = filter.type === 'unplaced' ? unplacedOf(collection, card) : (collection.stored[card.uuid]?.[filter.locationId] ?? 0);
		if (count > 0) cards.push(withCount(card, count));
	}
	return cards;
}

/** A storage location's entries, counting only the copies one collection keeps there, or every copy. */
export function locationCardsFrom(location: LocationDetail, collectionId: string | null): DeckCardEntry[] {
	if (collectionId === null) return location.cards;
	const cards: DeckCardEntry[] = [];
	for (const card of location.cards) {
		const count = location.sources[card.uuid]?.[collectionId] ?? 0;
		if (count > 0) cards.push(withCount(card, count));
	}
	return cards;
}

/** Copies kept in each storage location, and the unplaced remainder, across the whole collection. */
export function placementTotals(collection: CollectionDetail): { unplaced: number; byLocation: Record<string, number> } {
	const byLocation: Record<string, number> = {};
	for (const kept of Object.values(collection.stored))
		for (const entry of Object.entries(kept)) byLocation[entry[0]] = (byLocation[entry[0]] ?? 0) + entry[1];
	return { unplaced: collection.unplaced, byLocation };
}

/**
 * The fewest moves that take one printing's placements from `before` to `after`. Both
 * name copies per location; the unplaced copies are whatever the total leaves over.
 */
export function placementMoves(uuid: string, before: Record<string, number>, after: Record<string, number>): PlacementMove[] {
	const moves: PlacementMove[] = [];
	const surplus: Array<{ locationId: string; count: number }> = [];
	const shortfall: Array<{ locationId: string; count: number }> = [];
	for (const locationId of Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort()) {
		const change = (after[locationId] ?? 0) - (before[locationId] ?? 0);
		if (change < 0) surplus.push({ locationId, count: -change });
		if (change > 0) shortfall.push({ locationId, count: change });
	}
	// Copies go straight from a location losing them to one gaining them where they can.
	while (surplus.length && shortfall.length) {
		const from = surplus[0];
		const to = shortfall[0];
		const count = Math.min(from.count, to.count);
		moves.push({ uuid, from: from.locationId, to: to.locationId, count });
		from.count -= count;
		to.count -= count;
		if (!from.count) surplus.shift();
		if (!to.count) shortfall.shift();
	}
	for (const from of surplus) moves.push({ uuid, from: from.locationId, to: null, count: from.count });
	for (const to of shortfall) moves.push({ uuid, from: null, to: to.locationId, count: to.count });
	return moves;
}

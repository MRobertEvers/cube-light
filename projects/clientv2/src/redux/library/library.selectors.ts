import type { RootState } from '../root-reducers';
import {
	deckOwnership,
	deckOwnershipSummary,
	type DeckOwnershipSummary,
	type RowOwnership
} from '../../domain/library/ownership';
import { NO_OWNERSHIP, type Ownership } from '../../domain/models/library';
import type { GroupedDeck } from '../../domain/deck/grouping';

export function selectCollections(state: RootState) {
	return state.library.collections;
}
export function selectStorageLocations(state: RootState) {
	return state.library.locations;
}
export function selectLibraryError(state: RootState) {
	return state.library.error;
}
/** Null until the library has been read. */
export function selectOwnership(state: RootState): Ownership | null {
	return state.library.ownership;
}
export function selectCollection(state: RootState, collectionId: string) {
	return state.library.collectionsById[collectionId];
}
export function selectCollectionError(state: RootState, collectionId: string) {
	return state.library.collectionErrors[collectionId];
}
export function selectLocation(state: RootState, locationId: string) {
	return state.library.locationsById[locationId];
}
export function selectLocationError(state: RootState, locationId: string) {
	return state.library.locationErrors[locationId];
}
/** Collections that list cards someone is after. */
export function selectWantedCollections(state: RootState) {
	return (state.library.collections ?? []).filter((collection) => collection.role === 'wanted');
}

type DeckOwnership = { rows: Record<string, RowOwnership>; summary: DeckOwnershipSummary };

// One result per ownership and deck, so boards only re-render when either changes.
const deckOwnershipCache = new WeakMap<Ownership, WeakMap<GroupedDeck, DeckOwnership>>();

/**
 * Each card name's ownership in a deck, keyed by `ownedNameKey`, and the deck's totals.
 * Null until both the library and the deck have been read.
 */
export function selectDeckOwnership(state: RootState, deckId: string): DeckOwnership | null {
	const ownership = state.library.ownership;
	const deck = state.decks.byId[deckId];
	if (!ownership || !deck) return null;
	let byDeck = deckOwnershipCache.get(ownership);
	if (!byDeck) {
		byDeck = new WeakMap();
		deckOwnershipCache.set(ownership, byDeck);
	}
	let result = byDeck.get(deck);
	if (!result) {
		const rows = deckOwnership(ownership, deckId, deck.cards.concat(deck.sideboard ?? []));
		result = { rows, summary: deckOwnershipSummary(rows) };
		byDeck.set(deck, result);
	}
	return result;
}

/** The ownership to search owned cards with; empty until the library has been read. */
export function selectOwnershipOrEmpty(state: RootState): Ownership {
	return state.library.ownership ?? NO_OWNERSHIP;
}

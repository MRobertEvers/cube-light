import type { CollectionRole, PlacementMove, Placements } from '@torimtg/core';
import type { DeckColor } from '../deck/deck-colors';
import type { DeckCardEntry } from './deck';

export type { CollectionRole, PlacementMove, Placements };
export { MAX_LOCATION_DESCRIPTION_LENGTH } from '@torimtg/core';

export type CollectionSummary = {
	collectionId: string;
	name: string;
	role: CollectionRole;
	/** Every copy the collection holds. */
	copies: number;
	/** Distinct card names. Printings not yet described on this device are left out. */
	names: number;
	/** Copies not kept in any storage location. */
	unplaced: number;
	/** Every color in a held card's mana cost, in WUBRG order. */
	colors: DeckColor[];
	/** The artwork of the printing held most, for the collection's tile. */
	art: string | null;
	createdAt: string;
	updatedAt: string;
};
export type CollectionSummaries = Array<CollectionSummary>;

export type StorageLocationSummary = {
	locationId: string;
	name: string;
	description: string | null;
	/** Copies kept here, from every collection. */
	copies: number;
	/** The collections that keep copies here, by name. */
	collections: Array<{ collectionId: string; name: string }>;
};
export type StorageLocationSummaries = Array<StorageLocationSummary>;

export type CollectionDetail = {
	collectionId: string;
	name: string;
	role: CollectionRole;
	/** One entry per printing. Collections have one list, so every entry is on the main board. */
	cards: DeckCardEntry[];
	/** Where copies are kept. Placements in a storage location that was deleted are left out. */
	stored: Placements;
	copies: number;
	unplaced: number;
	/** Copies placed in a storage location that has since been deleted, by printing UUID. */
	orphaned: Record<string, number>;
	updatedAt: string;
};

export type LocationDetail = {
	locationId: string;
	name: string;
	description: string | null;
	/** One entry per printing, counting copies from every collection. */
	cards: DeckCardEntry[];
	/** Where each printing's copies here come from: UUID → collection ID → copies. */
	sources: Record<string, Record<string, number>>;
	/** The collections that keep copies here, by ID. */
	collections: Record<string, string>;
	copies: number;
};

/** One printing across every collection. */
export type OwnedPrinting = {
	uuid: string;
	/** Empty until this device has described the printing. */
	name: string;
	setCode: string;
	/** Copies across owned collections. */
	owned: number;
	/** Copies across wanted collections. */
	wanted: number;
	/** Owned copies by collection ID. */
	byCollection: Record<string, number>;
	/** Owned copies by storage location ID; the key '' holds unplaced copies. */
	byLocation: Record<string, number>;
};

/** One card name across every printing, collection and deck. */
export type OwnedName = {
	name: string;
	owned: number;
	wanted: number;
	/** Owned printings, most copies first. */
	uuids: string[];
	/** Copies listed by each deck (main and side board), by deck ID. */
	inDecks: Record<string, number>;
};

export type Ownership = {
	byUuid: Record<string, OwnedPrinting>;
	/** Keyed by `ownedNameKey(name)`. */
	byName: Record<string, OwnedName>;
};

export const NO_OWNERSHIP: Ownership = { byUuid: {}, byName: {} };

/** A copy count of a printing to add to, or take from, a collection. */
export type CollectionCardCount = { uuid: string; count: number };

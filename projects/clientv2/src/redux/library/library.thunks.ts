import { createAppThunk, type AppThunk } from '../thunk';
import { groupBoardCards } from '../../domain/deck/grouping';
import type { DeckCardStep } from '../../domain/deck/card-steps';
import type { ImportedCard } from '../../domain/models/deck';
import type {
	CollectionCardCount,
	CollectionDetail,
	CollectionRole,
	LocationDetail,
	PlacementMove
} from '../../domain/models/library';
import { librarySlice } from './librarySlice';
import type { GroupedCollection, GroupedLocation } from './library.types';

function groupCollection(collection: CollectionDetail): GroupedCollection {
	return {
		collectionId: collection.collectionId,
		name: collection.name,
		role: collection.role,
		cards: collection.cards,
		stored: collection.stored,
		copies: collection.copies,
		unplaced: collection.unplaced,
		orphaned: collection.orphaned,
		updatedAt: collection.updatedAt,
		board: groupBoardCards(collection.cards)
	};
}

function groupLocation(location: LocationDetail): GroupedLocation {
	return {
		locationId: location.locationId,
		name: location.name,
		description: location.description,
		cards: location.cards,
		sources: location.sources,
		collections: location.collections,
		copies: location.copies,
		board: groupBoardCards(location.cards)
	};
}

export const loadLibrary = createAppThunk('library/load', async function (_input: void, api) {
	const { value, revision } = await api.extra.library.overview();
	return { data: value, revision };
});

export const loadCollection = createAppThunk('library/loadCollection', async function (collectionId: string, api) {
	const { value, revision } = await api.extra.library.getCollection(collectionId);
	return { collectionId, data: groupCollection(value), revision };
});

export const loadLocation = createAppThunk('library/loadLocation', async function (locationId: string, api) {
	const { value, revision } = await api.extra.library.getLocation(locationId);
	return { locationId, data: groupLocation(value), revision };
});

/** Returns the new collection's id. */
export function createCollection(name: string, role: CollectionRole): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.createCollection(name, role);
	};
}

export function renameCollection(collectionId: string, name: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.renameCollection(collectionId, name);
	};
}

export function setCollectionRole(collectionId: string, role: CollectionRole): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.setCollectionRole(collectionId, role);
	};
}

export function deleteCollection(collectionId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.deleteCollection(collectionId);
	};
}

/** Returns the new storage location's id. */
export function createStorageLocation(name: string, description: string): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.createStorageLocation(name, description);
	};
}

export function describeStorageLocation(locationId: string, name: string, description: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.describeStorageLocation(locationId, name, description);
	};
}

export function deleteStorageLocation(locationId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.deleteStorageLocation(locationId);
	};
}

/** Adds copies of a named card to a collection, filed in `locationId` when one is given. */
export function addCardToCollection(collectionId: string, cardName: string, count: number, locationId: string | null): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.addCardByName(collectionId, cardName, count, locationId);
	};
}

export function importCollectionList(collectionId: string, cards: ImportedCard[]): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.importList(collectionId, cards);
	};
}

export function removeCollectionCards(collectionId: string, printings: string[]): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.removeCards(collectionId, printings);
	};
}

export function moveCollectionCards(fromCollectionId: string, toCollectionId: string, cards: CollectionCardCount[]): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.moveCards(fromCollectionId, toCollectionId, cards);
	};
}

export function placeCollectionCards(collectionId: string, moves: PlacementMove[]): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.placeCards(collectionId, moves);
	};
}

/** Adds what a deck lacks to a collection. Returns how many copies were added. */
export function addMissingFromDeck(deckId: string, collectionId: string): AppThunk<Promise<number>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.addMissingFromDeck(deckId, collectionId);
	};
}

/** Saves card editor steps as soon as they are taken, then puts the saved collection in the store. */
export function editCollectionCards(collectionId: string, steps: DeckCardStep[]): AppThunk<Promise<void>> {
	return async function (dispatch, _getState, engine) {
		const saved = await engine.library.applyCardSteps(collectionId, steps);
		if (saved) dispatch(librarySlice.actions.collectionReceived({ collectionId, data: groupCollection(saved.value), revision: saved.revision }));
	};
}

/**
 * Rereads the library, and every collection and location the store holds, from this device
 * after a change event. Skips everything until the library has been loaded once.
 */
export function refreshLocalLibrary(): AppThunk<Promise<void>> {
	return async function (dispatch, getState, engine) {
		const library = getState().library;
		if (library.collections !== null) {
			const overview = await engine.library.overviewLocal();
			if (overview) dispatch(librarySlice.actions.received({ data: overview.value, revision: overview.revision }));
		}
		for (const collectionId of Object.keys(library.collectionsById)) {
			const { collection, deleted, revision } = await engine.library.getCollectionLocal(collectionId);
			if (collection) dispatch(librarySlice.actions.collectionReceived({ collectionId, data: groupCollection(collection), revision }));
			else if (deleted) dispatch(librarySlice.actions.collectionDeleted({ collectionId, revision }));
		}
		for (const locationId of Object.keys(library.locationsById)) {
			const { location, deleted, revision } = await engine.library.getLocationLocal(locationId);
			if (location) dispatch(librarySlice.actions.locationReceived({ locationId, data: groupLocation(location), revision }));
			else if (deleted) dispatch(librarySlice.actions.locationDeleted({ locationId, revision }));
		}
	};
}

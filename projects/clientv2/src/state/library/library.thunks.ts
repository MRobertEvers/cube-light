import type { CollectionSummaries, StorageLocationSummaries } from '../../domain/models/library';
import type { AppThunk } from '../thunk';

export function readCollections(): AppThunk<Promise<CollectionSummaries>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.collections();
	};
}

export function readStorageLocations(): AppThunk<Promise<StorageLocationSummaries>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.storageLocations();
	};
}

/** Returns the new collection's id. */
export function createCollection(name: string): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.createCollection(name);
	};
}

/** Returns the new storage location's id. */
export function createStorageLocation(name: string): AppThunk<Promise<string>> {
	return function (_dispatch, _getState, engine) {
		return engine.library.createStorageLocation(name);
	};
}

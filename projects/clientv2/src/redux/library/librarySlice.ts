import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LibraryOverview } from '../../engine/api/library';
import { loadCollection, loadLibrary, loadLocation } from './library.thunks';
import type { GroupedCollection, GroupedLocation, LibraryState } from './library.types';

const initialState: LibraryState = {
	collections: null,
	locations: null,
	ownership: null,
	revision: 0,
	error: null,
	collectionsById: {},
	collectionRevisions: {},
	collectionErrors: {},
	locationsById: {},
	locationRevisions: {},
	locationErrors: {}
};

function overviewReceived(state: LibraryState, payload: { data: LibraryOverview; revision: number }) {
	if (payload.revision < state.revision) return;
	state.collections = payload.data.collections;
	state.locations = payload.data.locations;
	state.ownership = payload.data.ownership;
	state.revision = payload.revision;
	state.error = null;
}

function collectionReceived(state: LibraryState, payload: { collectionId: string; data: GroupedCollection; revision: number }) {
	if (payload.revision < (state.collectionRevisions[payload.collectionId] ?? 0)) return;
	state.collectionsById[payload.collectionId] = payload.data;
	state.collectionRevisions[payload.collectionId] = payload.revision;
	delete state.collectionErrors[payload.collectionId];
}

function locationReceived(state: LibraryState, payload: { locationId: string; data: GroupedLocation; revision: number }) {
	if (payload.revision < (state.locationRevisions[payload.locationId] ?? 0)) return;
	state.locationsById[payload.locationId] = payload.data;
	state.locationRevisions[payload.locationId] = payload.revision;
	delete state.locationErrors[payload.locationId];
}

export const librarySlice = createSlice({
	name: 'library',
	initialState,
	reducers: {
		received: function (state, action: PayloadAction<{ data: LibraryOverview; revision: number }>) {
			overviewReceived(state, action.payload);
		},
		collectionReceived: function (state, action: PayloadAction<{ collectionId: string; data: GroupedCollection; revision: number }>) {
			collectionReceived(state, action.payload);
		},
		collectionDeleted: function (state, action: PayloadAction<{ collectionId: string; revision: number }>) {
			const { collectionId, revision } = action.payload;
			delete state.collectionsById[collectionId];
			state.collectionRevisions[collectionId] = revision;
			state.collectionErrors[collectionId] = 'This collection was deleted.';
		},
		locationReceived: function (state, action: PayloadAction<{ locationId: string; data: GroupedLocation; revision: number }>) {
			locationReceived(state, action.payload);
		},
		locationDeleted: function (state, action: PayloadAction<{ locationId: string; revision: number }>) {
			const { locationId, revision } = action.payload;
			delete state.locationsById[locationId];
			state.locationRevisions[locationId] = revision;
			state.locationErrors[locationId] = 'This storage location was deleted.';
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadLibrary.fulfilled, (state, action) => {
				overviewReceived(state, action.payload);
			})
			.addCase(loadLibrary.rejected, (state, action) => {
				state.error = action.error.message ?? 'Unable to load the library';
			})
			.addCase(loadCollection.fulfilled, (state, action) => {
				collectionReceived(state, action.payload);
			})
			.addCase(loadCollection.rejected, (state, action) => {
				state.collectionErrors[action.meta.arg] = action.error.message ?? 'Unable to load the collection';
			})
			.addCase(loadLocation.fulfilled, (state, action) => {
				locationReceived(state, action.payload);
			})
			.addCase(loadLocation.rejected, (state, action) => {
				state.locationErrors[action.meta.arg] = action.error.message ?? 'Unable to load the storage location';
			});
	}
});

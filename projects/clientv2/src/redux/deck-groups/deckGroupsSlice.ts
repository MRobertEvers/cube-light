import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DeckGroup } from '../../domain/models/deck';
import { loadDeckGroups } from './deck-groups.thunks';
import type { DeckGroupsState } from './deck-groups.types';

const initialState: DeckGroupsState = {
	groups: null,
	revision: 0,
	error: null
};

export const deckGroupsSlice = createSlice({
	name: 'deckGroups',
	initialState,
	reducers: {
		received: function (state, action: PayloadAction<{ data: DeckGroup[]; revision: number }>) {
			if (action.payload.revision < state.revision) return;
			state.groups = action.payload.data;
			state.revision = action.payload.revision;
			state.error = null;
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadDeckGroups.fulfilled, (state, action) => {
				if (action.payload.revision < state.revision) return;
				state.groups = action.payload.data;
				state.revision = action.payload.revision;
				state.error = null;
			})
			.addCase(loadDeckGroups.rejected, (state, action) => {
				state.error = action.error.message ?? 'Unable to load deck groups';
			});
	}
});

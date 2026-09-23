import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ArenaTableState } from './arena-table.types';

const initialState: ArenaTableState = { searchByDeck: {} };

export const arenaTableSlice = createSlice({
	name: 'arenaTable',
	initialState,
	reducers: {
		arenaSearchChanged: function (
			state,
			action: PayloadAction<{ deckId: string; search: string }>
		) {
			const { deckId, search } = action.payload;
			if (search) state.searchByDeck[deckId] = search;
			else delete state.searchByDeck[deckId];
		}
	}
});

export const { arenaSearchChanged } = arenaTableSlice.actions;

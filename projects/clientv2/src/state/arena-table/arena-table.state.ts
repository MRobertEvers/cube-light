import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/** The Arena table's search, by deck. It lasts until the app reloads. */
export type ArenaTableState = {
	searchByDeck: Record<string, string>;
};

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

export function selectArenaSearch(
	state: { arenaTable: ArenaTableState },
	deckId: string
): string {
	return state.arenaTable.searchByDeck[deckId] ?? '';
}

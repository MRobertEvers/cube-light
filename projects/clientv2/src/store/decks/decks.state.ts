import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAPIDecks, FetchDecksResponse } from '../../api/fetch-api-decks';
import { fetchSortedDeck } from '../../workers/deck.functions';
import { GetDeckResponse } from '../../workers/deck.worker.messages';

export type DecksState = {
	list: FetchDecksResponse | null;
	byId: Record<string, GetDeckResponse>;
	listError: string | null;
	errorsById: Record<string, string>;
	listRequestId: string | null;
	requestIdsById: Record<string, string>;
};

const initialState: DecksState = {
	list: null,
	byId: {},
	listError: null,
	errorsById: {},
	listRequestId: null,
	requestIdsById: {}
};

export const loadDecks = createAsyncThunk('decks/loadList', async () =>
	fetchAPIDecks()
);
export const loadDeck = createAsyncThunk(
	'decks/loadDeck',
	async (deckId: string) => fetchSortedDeck(deckId)
);

export const decksSlice = createSlice({
	name: 'decks',
	initialState,
	reducers: {
		setInitialDecks: function (
			state,
			action: PayloadAction<FetchDecksResponse>
		) {
			state.list = action.payload;
		},
		setInitialDeck: function (
			state,
			action: PayloadAction<{ deckId: string; data: GetDeckResponse }>
		) {
			state.byId[action.payload.deckId] = action.payload.data;
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(loadDecks.pending, (state, action) => {
				state.listRequestId = action.meta.requestId;
				state.listError = null;
			})
			.addCase(loadDecks.fulfilled, (state, action) => {
				if (state.listRequestId !== action.meta.requestId) return;
				state.list = action.payload;
				state.listRequestId = null;
			})
			.addCase(loadDecks.rejected, (state, action) => {
				if (state.listRequestId !== action.meta.requestId) return;
				state.listError =
					action.error.message ?? 'Unable to load decks';
				state.listRequestId = null;
			})
			.addCase(loadDeck.pending, (state, action) => {
				const deckId = action.meta.arg;
				state.requestIdsById[deckId] = action.meta.requestId;
				delete state.errorsById[deckId];
			})
			.addCase(loadDeck.fulfilled, (state, action) => {
				const deckId = action.meta.arg;
				if (state.requestIdsById[deckId] !== action.meta.requestId)
					return;
				state.byId[deckId] = action.payload;
				delete state.requestIdsById[deckId];
			})
			.addCase(loadDeck.rejected, (state, action) => {
				const deckId = action.meta.arg;
				if (state.requestIdsById[deckId] !== action.meta.requestId)
					return;
				state.errorsById[deckId] =
					action.error.message ?? 'Unable to load deck';
				delete state.requestIdsById[deckId];
			});
	}
});

export const { setInitialDecks, setInitialDeck } = decksSlice.actions;

type DecksRootState = { decks: DecksState };

export function selectDecks(state: DecksRootState) {
	return state.decks.list;
}
export function selectDecksError(state: DecksRootState) {
	return state.decks.listError;
}
export function selectDeck(state: DecksRootState, deckId: string) {
	return state.decks.byId[deckId];
}
export function selectDeckError(state: DecksRootState, deckId: string) {
	return state.decks.errorsById[deckId];
}

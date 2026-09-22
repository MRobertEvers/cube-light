import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchAPIDecks, FetchDecksResponse } from '../../api/fetch-api-decks';
import { groupDeck } from '../../workers/deck.functions';
import type { FetchAPIDeckResponse } from '../../api/fetch-api-deck';
import type { ToriMTG } from '../../torimtg/types';
import { readAvailable } from '../../torimtg/ui-api';
import { GetDeckResponse } from '../../workers/deck.worker.messages';

export type DecksState = {
	list: FetchDecksResponse | null;
	byId: Record<string, GetDeckResponse>;
	listError: string | null;
	errorsById: Record<string, string>;
	listRequestId: string | null;
	requestIdsById: Record<string, string>;
	listRevision: number;
	revisionsById: Record<string, number>;
};

const initialState: DecksState = {
	list: null,
	byId: {},
	listError: null,
	errorsById: {},
	listRequestId: null,
	requestIdsById: {},
	listRevision: 0,
	revisionsById: {}
};

export const loadDecks = createAsyncThunk('decks/loadList', async function (_input: void, api) {
	const { tori } = api.extra as { tori: ToriMTG };
	await readAvailable<FetchDecksResponse>(tori, { type: 'decks' });
	const snapshot = await tori.queries.read<FetchDecksResponse>({ type: 'decks' });
	return { data: snapshot.data || [], revision: snapshot.localRevision };
});
export const loadDeck = createAsyncThunk(
	'decks/loadDeck',
	async function (deckId: string, api) {
		const { tori } = api.extra as { tori: ToriMTG };
		await readAvailable<FetchAPIDeckResponse>(tori, { type: 'deck', id: deckId });
		const snapshot = await tori.queries.read<FetchAPIDeckResponse>({ type: 'deck', id: deckId });
		if (!snapshot.data) throw new Error('This deck was deleted or is not downloaded.');
		return { data: groupDeck(snapshot.data), revision: snapshot.localRevision };
	}
);

export const decksSlice = createSlice({
	name: 'decks',
	initialState,
	reducers: {
		listReceived: function (state, action: PayloadAction<{ data: FetchDecksResponse; revision: number }>) {
			if (action.payload.revision >= state.listRevision) { state.list = action.payload.data; state.listRevision = action.payload.revision; }
		},
		deckDeleted: function (state, action: PayloadAction<{ deckId: string; revision: number }>) {
			const { deckId, revision } = action.payload;
			if (revision < (state.revisionsById[deckId] || 0)) return;
			delete state.byId[deckId]; state.revisionsById[deckId] = revision;
			state.errorsById[deckId] = 'This deck has been deleted.';
		},
		setInitialDecks: function (
			state,
			action: PayloadAction<FetchDecksResponse>
		) {
			state.list = action.payload;
		},
		setInitialDeck: function (
			state,
			action: PayloadAction<{ deckId: string; data: GetDeckResponse; revision?: number }>
		) {
			if (action.payload.revision !== undefined && action.payload.revision < (state.revisionsById[action.payload.deckId] || 0)) return;
			state.byId[action.payload.deckId] = action.payload.data;
			if (action.payload.revision !== undefined) state.revisionsById[action.payload.deckId] = action.payload.revision;
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
				if (action.payload.revision >= state.listRevision) { state.list = action.payload.data; state.listRevision = action.payload.revision; }
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
				if (action.payload.revision >= (state.revisionsById[deckId] || 0)) { state.byId[deckId] = action.payload.data; state.revisionsById[deckId] = action.payload.revision; }
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

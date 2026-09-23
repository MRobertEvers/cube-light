import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DeckSummaries } from '../../domain/models/deck';
import type { GroupedDeck } from '../../domain/deck/grouping';
import { deleteDeckCardGroup, loadDeck, loadDecks, moveDeckCardGroup } from './decks.thunks';
import type { DecksState } from './decks.types';

const initialState: DecksState = {
	list: null,
	byId: {},
	listError: null,
	errorsById: {},
	listRequestId: null,
	requestIdsById: {},
	listRevision: 0,
	revisionsById: {},
	cardActionsById: {}
};

export const decksSlice = createSlice({
	name: 'decks',
	initialState,
	reducers: {
		listReceived: function (state, action: PayloadAction<{ data: DeckSummaries; revision: number }>) {
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
			action: PayloadAction<DeckSummaries>
		) {
			state.list = action.payload;
		},
		setInitialDeck: function (
			state,
			action: PayloadAction<{ deckId: string; data: GroupedDeck; revision?: number }>
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
		const cardActions = [
			{ thunk: moveDeckCardGroup, verb: 'move' },
			{ thunk: deleteDeckCardGroup, verb: 'delete' }
		];
		for (const failure of cardActions) {
			const { thunk, verb } = failure;
			builder
				.addCase(thunk.pending, (state, action) => {
					const { deckId, group } = action.meta.arg;
					state.cardActionsById[deckId] = {
						busy: { board: group.board, name: group.name },
						error: null
					};
				})
				.addCase(thunk.fulfilled, (state, action) => {
					delete state.cardActionsById[action.meta.arg.deckId];
				})
				.addCase(thunk.rejected, (state, action) => {
					const { deckId, group } = action.meta.arg;
					// A rejected condition means another edit is still running.
					if (action.meta.condition) return;
					state.cardActionsById[deckId] = {
						busy: null,
						error: `Unable to ${verb} ${group.name}. Please try again.`
					};
				});
		}
	}
});

export const { setInitialDecks, setInitialDeck } = decksSlice.actions;

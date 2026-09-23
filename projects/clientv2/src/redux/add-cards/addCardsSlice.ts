import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DeckBoard } from '../../domain/models/deck';
import { importDeckCards } from './add-cards.thunks';
import type { AddCardsState } from './add-cards.types';

const initialState: AddCardsState = {
	open: false,
	deckId: null,
	text: '',
	board: 'main',
	submitting: false,
	error: null,
	unknownCards: []
};

export const addCardsSlice = createSlice({
	name: 'addCards',
	initialState,
	reducers: {
		openAddCards: function (
			state,
			action: PayloadAction<{ deckId: string; board?: DeckBoard }>
		) {
			Object.assign(state, initialState, {
				open: true,
				deckId: action.payload.deckId,
				board: action.payload.board ?? 'main'
			});
		},
		setAddCardsBoard: function (state, action: PayloadAction<DeckBoard>) {
			state.board = action.payload;
		},
		closeAddCards: function (state) {
			Object.assign(state, initialState);
		},
		setAddCardsText: function (state, action: PayloadAction<string>) {
			state.text = action.payload;
			state.unknownCards = [];
			state.error = null;
		}
	},
	extraReducers: function (builder) {
		builder
			.addCase(importDeckCards.pending, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.submitting = true;
				state.error = null;
			})
			.addCase(importDeckCards.fulfilled, (state, action) => {
				if (state.deckId === action.meta.arg.deckId)
					Object.assign(state, initialState);
			})
			.addCase(importDeckCards.rejected, (state, action) => {
				if (state.deckId !== action.meta.arg.deckId) return;
				state.submitting = false;
				if (action.payload) {
					state.unknownCards = action.payload.unknownCards;
					state.error = action.payload.message;
				} else {
					state.error =
						action.error.message ??
						'Unable to add these cards. Please try again.';
				}
			});
	}
});

export const {
	openAddCards,
	closeAddCards,
	setAddCardsText,
	setAddCardsBoard
} = addCardsSlice.actions;

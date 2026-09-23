import { createAppThunk } from '../thunk';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	ImportCardsError,
	type DeckBoard,
	type ImportedCard
} from '../../domain/models/deck';
import { loadDeck } from '../decks/decks.state';

export type AddCardsState = {
	open: boolean;
	deckId: string | null;
	text: string;
	/** Where lines before any Deck or Sideboard heading go. */
	board: DeckBoard;
	submitting: boolean;
	error: string | null;
	// Lowercased names the server couldn't resolve on the last submit.
	unknownCards: string[];
};

const initialState: AddCardsState = {
	open: false,
	deckId: null,
	text: '',
	board: 'main',
	submitting: false,
	error: null,
	unknownCards: []
};

type ImportRejection = { message: string; unknownCards: string[] };

export const importDeckCards = createAppThunk<
	void,
	{ deckId: string; cards: ImportedCard[] },
	{ rejectValue: ImportRejection }
>('addCards/import', async (args, context) => {
	const { deckId, cards } = args;
	const { dispatch, rejectWithValue } = context;
	const { decks } = context.extra;
	try {
		await decks.importList(deckId, cards);
	} catch (cause) {
		if (
			cause instanceof ImportCardsError &&
			cause.unknownCards.length > 0
		) {
			return rejectWithValue({
				message:
					'Fix or remove the unknown cards, then try again. Nothing was added.',
				unknownCards: cause.unknownCards.map((name) =>
					name.toLowerCase()
				)
			});
		}
		throw cause;
	}
});

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

export function selectAddCards(state: { addCards: AddCardsState }) {
	return state.addCards;
}

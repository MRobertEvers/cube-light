import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	fetchAPIImportCards,
	ImportCardsError,
	ImportedCard
} from '../../api/fetch-api-import-cards';
import { withMinimumStatusDuration } from '../../utils/minimum-status-duration';
import { loadDeck } from '../decks/decks.state';

export type AddCardsState = {
	open: boolean;
	deckId: string | null;
	text: string;
	submitting: boolean;
	error: string | null;
	// Lowercased names the server couldn't resolve on the last submit.
	unknownCards: string[];
};

const initialState: AddCardsState = {
	open: false,
	deckId: null,
	text: '',
	submitting: false,
	error: null,
	unknownCards: []
};

type ImportRejection = { message: string; unknownCards: string[] };

export const importDeckCards = createAsyncThunk<
	void,
	{ deckId: string; cards: ImportedCard[] },
	{ rejectValue: ImportRejection }
>('addCards/import', async (args, context) => {
	const { deckId, cards } = args;
	const { dispatch, rejectWithValue } = context;
	try {
		await withMinimumStatusDuration(async () => {
			await fetchAPIImportCards(deckId, cards);
			// The cards are saved at this point; a failed refresh shouldn't read as a failed add.
			await dispatch(loadDeck(deckId))
				.unwrap()
				.catch(() => undefined);
		});
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
			action: PayloadAction<{ deckId: string }>
		) {
			Object.assign(state, initialState, {
				open: true,
				deckId: action.payload.deckId
			});
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

export const { openAddCards, closeAddCards, setAddCardsText } =
	addCardsSlice.actions;

export function selectAddCards(state: { addCards: AddCardsState }) {
	return state.addCards;
}

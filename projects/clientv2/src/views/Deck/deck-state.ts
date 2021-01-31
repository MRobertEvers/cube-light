import { ActionReducerMapBuilder, createAction, createReducer } from '@reduxjs/toolkit';
import { FetchDeckCardResponse } from 'src/api/fetch-api-deck';

// Based on "Ariel - Beta Test Questionaire.docx"
export type DeckState = {
	viewEditCard: FetchDeckCardResponse | null;
	viewAddCard: boolean;
};

export const initialState: DeckState = {
	viewEditCard: null,
	viewAddCard: true
};

export const Actions = {
	setEditCard: createAction<FetchDeckCardResponse | null>('setEditCard'),
	setViewAddCard: createAction<boolean>('setViewAddCard')
};

function buildReducer(builder: ActionReducerMapBuilder<DeckState>) {
	return builder
		.addCase(Actions.setEditCard, (slice, action) => {
			slice.viewEditCard = action.payload;
		})
		.addCase(Actions.setViewAddCard, (slice, action) => {
			slice.viewAddCard = action.payload;
		});
}

export const reducer = createReducer(initialState, buildReducer);

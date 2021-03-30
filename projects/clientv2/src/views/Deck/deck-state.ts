import { ActionReducerMapBuilder, createAction, createReducer } from '@reduxjs/toolkit';
import { FetchAPIDeckCardResponse } from 'src/api/fetch-api-deck';

export type DeckState = {
	viewEditCard: FetchAPIDeckCardResponse | null;
	viewAddCard: boolean;
};

export const initialState: DeckState = {
	viewEditCard: null,
	viewAddCard: false
};

export const Actions = {
	setEditCard: createAction<FetchAPIDeckCardResponse | null>('setEditCard'),
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

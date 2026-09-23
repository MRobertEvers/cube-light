import {
	ActionReducerMapBuilder,
	createAction,
	createReducer
} from '@reduxjs/toolkit';
import { DeckCardEntry } from 'src/domain/models/deck';

export type DeckState = {
	viewEditCard: DeckCardEntry | null;
	viewAddCard: boolean;
};

export const initialState: DeckState = {
	viewEditCard: null,
	viewAddCard: false
};

export const Actions = {
	setEditCard: createAction<DeckCardEntry | null>('setEditCard'),
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

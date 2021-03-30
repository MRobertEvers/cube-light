import { ActionReducerMapBuilder, createAction, createReducer } from '@reduxjs/toolkit';
import { FetchAPIDeckCardResponse } from 'src/api/fetch-api-deck';

// Based on "Ariel - Beta Test Questionaire.docx"
export type AddCardState = {
	viewIsDropDownVisible: boolean;
	viewAddItemText: string;
	viewAddItemCount: number;

	suggestionsData: { sorted: string[]; set: Set<string> };
};

export const initialState: AddCardState = {
	viewIsDropDownVisible: false,
	viewAddItemText: '',
	viewAddItemCount: 1,

	suggestionsData: { sorted: [], set: new Set() }
};

export const Actions = {
	setSuggestionsData: createAction<{ sorted: string[]; set: Set<string> }>('setSuggestionsData'),
	setViewIsDropDownVisible: createAction<boolean>('setViewIsDropDownVisible'),
	setViewAddItemText: createAction<string>('setViewAddItemText'),
	setViewAddItemCount: createAction<number>('setViewAddItemCount')
};

function buildReducer(builder: ActionReducerMapBuilder<AddCardState>) {
	return builder
		.addCase(Actions.setViewIsDropDownVisible, (slice, action) => {
			slice.viewIsDropDownVisible = action.payload;
		})
		.addCase(Actions.setSuggestionsData, (slice, action) => {
			slice.suggestionsData = action.payload;
		})
		.addCase(Actions.setViewAddItemCount, (slice, action) => {
			if (action.payload > 0) {
				slice.viewAddItemCount = action.payload;
			} else {
				slice.viewAddItemCount = 1;
			}
		})
		.addCase(Actions.setViewAddItemText, (slice, action) => {
			slice.viewAddItemText = action.payload;
		});
}

export const reducerAddCard = createReducer(initialState, buildReducer);

import {
	ActionReducerMapBuilder,
	createAction,
	createReducer
} from '@reduxjs/toolkit';
import type { DeckBoard } from '../../../../api/fetch-api-deck';

// Based on "Ariel - Beta Test Questionaire.docx"
export type AddCardState = {
	viewIsDropDownVisible: boolean;
	viewAddItemText: string;
	/** Copies to add to each board; one add can fill both. */
	viewAddItemCounts: Record<DeckBoard, number>;

	suggestionsData: { sorted: string[]; set: Set<string> };
};

export const initialState: AddCardState = {
	viewIsDropDownVisible: false,
	viewAddItemText: '',
	viewAddItemCounts: { main: 1, side: 0 },

	suggestionsData: { sorted: [], set: new Set() }
};

export const Actions = {
	setSuggestionsData: createAction<{ sorted: string[]; set: Set<string> }>(
		'setSuggestionsData'
	),
	setViewIsDropDownVisible: createAction<boolean>('setViewIsDropDownVisible'),
	setViewAddItemText: createAction<string>('setViewAddItemText'),
	setViewAddItemCount: createAction<{ board: DeckBoard; count: number }>(
		'setViewAddItemCount'
	)
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
			const { board, count } = action.payload;
			slice.viewAddItemCounts[board] = Number.isSafeInteger(count)
				? Math.max(0, Math.min(999, count))
				: 0;
		})
		.addCase(Actions.setViewAddItemText, (slice, action) => {
			slice.viewAddItemText = action.payload;
		});
}

export const reducerAddCard = createReducer(initialState, buildReducer);

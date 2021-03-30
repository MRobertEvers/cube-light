import { createSlice } from '@reduxjs/toolkit';
import { ActionsCardNameLookup } from './card-name-lookup.actions';
import { CardNameLookupState } from './card-name-lookup.types';

export const initialCardNameLookupSlice: CardNameLookupState = {
	cardNameLookupTable: null
};

export const cardNameLookupSlice = createSlice({
	name: 'cardNameLookup',
	initialState: initialCardNameLookupSlice,
	// Ignore this field for typed reducers
	reducers: {},
	extraReducers: (builder) =>
		builder.addCase(ActionsCardNameLookup.getCardNameLookup.fulfilled, (slice, action) => {
			slice.cardNameLookupTable = action.payload;
		})
});

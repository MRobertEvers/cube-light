import { configureStore as configureStoreToolkit, getDefaultMiddleware } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import { cardNameLookupSlice } from './card-name-lookup/card-name-lookup.state';

import type { RootState } from './root-state.types';

const rootReducer = combineReducers<RootState>({
	[cardNameLookupSlice.name]: cardNameLookupSlice.reducer
});

export function configureStore() {
	return configureStoreToolkit({
		reducer: rootReducer,
		middleware: getDefaultMiddleware()
	});
}

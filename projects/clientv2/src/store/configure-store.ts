import {
	configureStore as configureStoreToolkit,
	EnhancedStore,
	getDefaultMiddleware
} from '@reduxjs/toolkit';
import { combineReducers, ReducersMapObject } from 'redux';
import { cardNameLookupSlice } from './card-name-lookup/card-name-lookup.state';
import { createReducerManager, ReducerManager } from './create-reducer-manager';

import type { RootState } from './root-state.types';

const rootReducer: ReducersMapObject<RootState> = {
	[cardNameLookupSlice.name]: cardNameLookupSlice.reducer
};

export type StoreType = EnhancedStore<RootState, any> & {
	reducerManager: ReducerManager<RootState>;
};

export function configureStore(): StoreType {
	const reducerManager = createReducerManager(rootReducer);

	const store = configureStoreToolkit({
		reducer: reducerManager.reduce,
		middleware: getDefaultMiddleware()
	});

	return {
		...store,
		reducerManager: reducerManager
	};
}

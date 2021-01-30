import { configureStore as configureStoreToolkit, getDefaultMiddleware } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

import type { RootState } from './root-state.types';

const rootReducer = combineReducers<RootState>({});

export function configureStore() {
	return configureStoreToolkit({
		reducer: rootReducer,
		middleware: getDefaultMiddleware()
	});
}

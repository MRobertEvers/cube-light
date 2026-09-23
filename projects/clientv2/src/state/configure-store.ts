import {
	configureStore as configureStoreToolkit,
	EnhancedStore
} from '@reduxjs/toolkit';
import type { ReducersMapObject } from 'redux';
import { createReducerManager, ReducerManager } from './create-reducer-manager';
import { rootReducers, type StoreState } from './root-reducers';
import { ACCOUNT_RESET } from './projections';
import type { ToriMTGEngine } from '../engine/tori-mtg-engine';

export type StoreType = EnhancedStore<StoreState> & {
	reducerManager: ReducerManager<StoreState>;
};

/** Thunks receive the ToriMTGEngine as their extra argument; nothing else in the UI sees it. */
export function configureStore(engine: ToriMTGEngine): StoreType {
	const reducerManager = createReducerManager<StoreState>(rootReducers as ReducersMapObject<StoreState>);

	const store = configureStoreToolkit({
		// Another account's data must never show; the session slice itself survives the reset.
		reducer: function (state, action) {
			return reducerManager.reduce(action.type === ACCOUNT_RESET ? ({ session: state?.session } as StoreState) : state, action);
		},
		middleware: function (getDefaultMiddleware) {
			return getDefaultMiddleware({ thunk: { extraArgument: engine } });
		}
	});

	return {
		...store,
		reducerManager: reducerManager
	};
}

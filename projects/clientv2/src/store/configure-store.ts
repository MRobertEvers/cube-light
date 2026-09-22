import {
	configureStore as configureStoreToolkit,
	EnhancedStore
} from '@reduxjs/toolkit';
import { ReducersMapObject } from 'redux';
import { cardNameLookupSlice } from './card-name-lookup/card-name-lookup.state';
import { decksSlice } from './decks/decks.state';
import { bannerPickerSlice } from './banner-picker/banner-picker.state';
import { addCardsSlice } from './add-cards/add-cards.state';
import { appearanceSettingsSlice } from './appearance-settings/appearance-settings.state';
import { createReducerManager, ReducerManager } from './create-reducer-manager';

import type { RootState } from './root-state.types';

const rootReducer: ReducersMapObject<RootState> = {
	[cardNameLookupSlice.name]: cardNameLookupSlice.reducer,
	[decksSlice.name]: decksSlice.reducer,
	[bannerPickerSlice.name]: bannerPickerSlice.reducer,
	[addCardsSlice.name]: addCardsSlice.reducer,
	[appearanceSettingsSlice.name]: appearanceSettingsSlice.reducer
};

export type StoreType = EnhancedStore<RootState, any> & {
	reducerManager: ReducerManager<RootState>;
};

export function configureStore(): StoreType {
	const reducerManager = createReducerManager(rootReducer);

	const store = configureStoreToolkit({
		reducer: reducerManager.reduce,
		middleware: function (getDefaultMiddleware) {
			return getDefaultMiddleware();
		}
	});

	return {
		...store,
		reducerManager: reducerManager
	};
}

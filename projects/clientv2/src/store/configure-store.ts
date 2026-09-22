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
import { historyModalSlice } from './history-modal/history-modal.state';
import { createReducerManager, ReducerManager } from './create-reducer-manager';

import type { RootState } from './root-state.types';
import { tori } from '../torimtg';
import type { ToriMTG } from '../torimtg';
import { bindDataRunner } from '../torimtg/ui-api';
import { offlineSlice } from './offline.state';
import { groupDeck } from '../workers/deck.functions';
import type { FetchAPIDeckResponse } from '../api/fetch-api-deck';
import type { FetchDecksResponse } from '../api/fetch-api-decks';
import { reportUnauthorized } from '../api/utils';

const rootReducer: ReducersMapObject<RootState> = {
	[offlineSlice.name]: offlineSlice.reducer,
	[cardNameLookupSlice.name]: cardNameLookupSlice.reducer,
	[decksSlice.name]: decksSlice.reducer,
	[bannerPickerSlice.name]: bannerPickerSlice.reducer,
	[addCardsSlice.name]: addCardsSlice.reducer,
	[appearanceSettingsSlice.name]: appearanceSettingsSlice.reducer,
	[historyModalSlice.name]: historyModalSlice.reducer
};

export type StoreType = EnhancedStore<RootState, any> & {
	reducerManager: ReducerManager<RootState>;
};

export function configureStore(): StoreType {
	const reducerManager = createReducerManager(rootReducer);

	const store = configureStoreToolkit({
		reducer: function (state, action) { return reducerManager.reduce(action.type === 'torimtg/accountReset' ? undefined : state, action); },
		middleware: function (getDefaultMiddleware) {
			return getDefaultMiddleware({ thunk: { extraArgument: { tori } } });
		}
	});
	bindDataRunner(function <T>(work: (core: ToriMTG) => Promise<T>): Promise<T> {
		return store.dispatch(async function (_dispatch, _getState, extra) {
			return work(extra.tori);
		});
	});
	let refreshing = false;
	let dirty = false;
	let currentPartition: string | null = null;
	tori.subscribe(async (notice) => {
		if (currentPartition !== null && currentPartition !== notice.partition) store.dispatch({ type: 'torimtg/accountReset' });
		currentPartition = notice.partition;
		dirty = true;
		if (refreshing) return;
		refreshing = true;
		try {
			while (dirty) {
				dirty = false;
				const snapshot = await tori.queries.read<FetchDecksResponse>({ type: 'decks' });
				store.dispatch(offlineSlice.actions.received(snapshot));
				if (snapshot.refresh === 'auth-required') reportUnauthorized();
				if (snapshot.presence !== 'missing') store.dispatch(decksSlice.actions.listReceived({ data: snapshot.data!, revision: snapshot.localRevision }));
				const ids = Object.keys(store.getState().decks?.byId || {});
				for (const deckId of ids) {
					const deck = await tori.queries.read<FetchAPIDeckResponse>({ type: 'deck', id: deckId });
					if (deck.data) store.dispatch(decksSlice.actions.setInitialDeck({ deckId, data: groupDeck(deck.data), revision: deck.localRevision }));
					else if (deck.presence === 'complete') store.dispatch(decksSlice.actions.deckDeleted({ deckId, revision: deck.localRevision }));
				}
			}
		} catch { /* An account lock discards pending callbacks. */ }
		finally { refreshing = false; }
	});

	return {
		...store,
		reducerManager: reducerManager
	};
}

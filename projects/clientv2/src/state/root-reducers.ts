import { offlineSlice } from './offline.state';
import { sessionSlice } from './session/session.state';
import { scansSlice } from './scans/scans.state';
import { cardNameLookupSlice } from './card-name-lookup/card-name-lookup.state';
import { decksSlice } from './decks/decks.state';
import { bannerPickerSlice } from './banner-picker/banner-picker.state';
import { addCardsSlice } from './add-cards/add-cards.state';
import { appearanceSettingsSlice } from './appearance-settings/appearance-settings.state';
import { historyModalSlice } from './history-modal/history-modal.state';
import { arenaTableSlice } from './arena-table/arena-table.state';

/** Every slice the store starts with. RootState is derived from this map. */
export const rootReducers = {
	[offlineSlice.name]: offlineSlice.reducer,
	[sessionSlice.name]: sessionSlice.reducer,
	[scansSlice.name]: scansSlice.reducer,
	[cardNameLookupSlice.name]: cardNameLookupSlice.reducer,
	[decksSlice.name]: decksSlice.reducer,
	[bannerPickerSlice.name]: bannerPickerSlice.reducer,
	[addCardsSlice.name]: addCardsSlice.reducer,
	[appearanceSettingsSlice.name]: appearanceSettingsSlice.reducer,
	[historyModalSlice.name]: historyModalSlice.reducer,
	[arenaTableSlice.name]: arenaTableSlice.reducer
};

export type RootState = { [Slice in keyof typeof rootReducers]: ReturnType<(typeof rootReducers)[Slice]> };

/** The whole store: RootState plus the reducers widgets add at runtime, under keys only they know. */
export type StoreState = RootState & Record<string, unknown>;

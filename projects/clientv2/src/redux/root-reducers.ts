import { offlineSlice } from './offline/offlineSlice';
import { sessionSlice } from './session/sessionSlice';
import { scansSlice } from './scans/scansSlice';
import { cardNameLookupSlice } from './card-name-lookup/cardNameLookupSlice';
import { decksSlice } from './decks/decksSlice';
import { bannerPickerSlice } from './banner-picker/bannerPickerSlice';
import { addCardsSlice } from './add-cards/addCardsSlice';
import { appearanceSettingsSlice } from './appearance-settings/appearanceSettingsSlice';
import { historyModalSlice } from './history-modal/historyModalSlice';
import { arenaTableSlice } from './arena-table/arenaTableSlice';

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

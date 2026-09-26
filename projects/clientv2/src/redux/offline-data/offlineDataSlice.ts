import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { NO_OFFLINE_DATA_UPDATES } from '../../domain/models/offline-data';
import type { OfflineDataState } from './offline-data.types';

const initialState: OfflineDataState = {
	updates: NO_OFFLINE_DATA_UPDATES
};

export const offlineDataSlice = createSlice({
	name: 'offlineData',
	initialState,
	reducers: {
		cardDataChecked: function (state, action: PayloadAction<boolean>) {
			state.updates = { cardData: action.payload, cardArt: state.updates.cardArt };
		},
		cardArtChecked: function (state, action: PayloadAction<boolean>) {
			state.updates = { cardData: state.updates.cardData, cardArt: action.payload };
		}
	}
});

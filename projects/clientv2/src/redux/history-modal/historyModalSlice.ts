import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HistoryModalEntry, HistoryModalState } from './history-modal.types';

const initialState: HistoryModalState = {
	entry: null
};

export const historyModalSlice = createSlice({
	name: 'historyModal',
	initialState,
	reducers: {
		restoreHistoryModal: function (
			state,
			action: PayloadAction<HistoryModalEntry | null>
		) {
			state.entry = action.payload;
		}
	}
});

export const { restoreHistoryModal } = historyModalSlice.actions;

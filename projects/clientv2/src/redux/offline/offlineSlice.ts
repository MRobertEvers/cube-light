import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SyncStatus } from '../../engine/events';
import type { OfflineState } from './offline.types';

const initialState: OfflineState = {
	revision: 0,
	pending: 0,
	conflicts: 0,
	status: 'idle',
	lastValidatedAt: null,
	error: null
};
export const offlineSlice = createSlice({
	name: 'offline',
	initialState,
	reducers: {
		received: function (state, action: PayloadAction<SyncStatus>) {
			if (action.payload.localRevision < state.revision) return;
			state.revision = action.payload.localRevision;
			state.pending = action.payload.pendingCount;
			state.conflicts = action.payload.conflictCount;
			state.status = action.payload.refresh;
			state.lastValidatedAt = action.payload.lastValidatedAt;
			state.error = action.payload.lastError;
		},
		reset: function () {
			return initialState;
		}
	}
});

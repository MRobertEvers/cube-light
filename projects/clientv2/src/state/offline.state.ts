import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { LocalSnapshot } from '@torimtg/core';
import type { SyncStatus } from '../engine/events';
import type { PendingEdit } from '../domain/models/pending-edit';
import type { AppThunk } from './thunk';

export type OfflineState = {
	revision: number;
	pending: number;
	conflicts: number;
	status: LocalSnapshot['refresh'];
	lastValidatedAt: string | null;
	error: string | null;
};
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

/** Edits saved on this device that the server has not accepted yet. */
export function readPendingEdits(): AppThunk<Promise<PendingEdit[]>> {
	return function (_dispatch, _getState, engine) {
		return engine.sync.pendingEdits();
	};
}

/** Keeps or drops a refused edit, with the later edits that depend on it. */
export function resolveEdit(editId: string, choice: 'mine' | 'server'): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return choice === 'mine' ? engine.sync.keepMine(editId) : engine.sync.useServer(editId);
	};
}

/** Every unsynced edit and its images, as a JSON file. */
export function exportUnsyncedEdits(): AppThunk<Promise<Blob>> {
	return function (_dispatch, _getState, engine) {
		return engine.sync.exportUnsynced();
	};
}

export function retrySync(): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.sync.retryNow();
	};
}

export function selectOffline(state: { offline: OfflineState }): OfflineState {
	return state.offline;
}

/** Changes whenever saved data changes; views that read on their own reread when it does. */
export function selectDataRevision(state: { offline: OfflineState }): number {
	return state.offline.revision;
}

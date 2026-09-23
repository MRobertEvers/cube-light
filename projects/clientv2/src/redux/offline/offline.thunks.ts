import type { PendingEdit } from '../../domain/models/pending-edit';
import type { AppThunk } from '../thunk';

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

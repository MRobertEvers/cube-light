import type { PendingEdit } from '../../domain/models/pending-edit';
import type { OfflineShellStatus } from '../../domain/models/offline-shell';
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

/** Reports whether the app can start with no network here, now and on every change. Returns a stop function. */
export function watchOfflineShell(listener: (status: OfflineShellStatus) => void): AppThunk<() => void> {
	return function (_dispatch, _getState, engine) {
		return engine.offlineShell.watch(listener);
	};
}

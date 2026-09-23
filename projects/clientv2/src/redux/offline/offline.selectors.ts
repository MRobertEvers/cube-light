import type { RootState } from '../root-reducers';
import type { OfflineState } from './offline.types';

export function selectOffline(state: RootState): OfflineState {
	return state.offline;
}

/** Changes whenever saved data changes; views that read on their own reread when it does. */
export function selectDataRevision(state: RootState): number {
	return state.offline.revision;
}

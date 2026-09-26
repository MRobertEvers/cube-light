import type { OfflineDataUpdates } from '../../domain/models/offline-data';
import type { RootState } from '../root-reducers';

export function selectOfflineDataUpdates(state: RootState): OfflineDataUpdates {
	return state.offlineData.updates;
}

/** Whether any installed offline data has an update, for the app to point to Profile. */
export function selectOfflineDataNeedsUpdate(state: RootState): boolean {
	return state.offlineData.updates.cardData || state.offlineData.updates.cardArt;
}

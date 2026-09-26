import type { OfflineDataUpdates } from '../../domain/models/offline-data';

export type OfflineDataState = {
	/** Which installed offline data the server has a newer build of, as last checked. */
	updates: OfflineDataUpdates;
};

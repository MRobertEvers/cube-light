import type { RootState } from '../root-reducers';

/**
 * Whether cards should be drawn from the offline card art pack: the server is out of
 * reach and the art is installed. Views with an offline-art form choose it by this.
 */
export function selectOfflineCardArt(state: RootState): boolean {
	return state.connectivity.connectivity !== 'online' && state.cardArt.installed;
}

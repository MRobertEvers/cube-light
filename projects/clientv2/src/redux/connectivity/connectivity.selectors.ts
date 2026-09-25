import type { Connectivity } from '../../domain/models/connectivity';
import type { RootState } from '../root-reducers';

/** Whether the server can be reached; views with an offline form choose it by this. */
export function selectConnectivity(state: RootState): Connectivity {
	return state.connectivity.connectivity;
}

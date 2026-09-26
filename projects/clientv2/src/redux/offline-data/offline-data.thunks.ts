import type { AppThunk } from '../thunk';
import { readCardArtStatus } from '../card-art/card-art.thunks';
import { readCardPackStatus } from '../card-pack/card-pack.thunks';

/**
 * Asks the server which offline data it has a newer build of than this device holds, and
 * records the answer (readCardPackStatus and readCardArtStatus do). Answers nothing new
 * when the server cannot be reached.
 */
export function checkOfflineDataUpdates(): AppThunk<Promise<void>> {
	return async function (dispatch) {
		await Promise.all([dispatch(readCardPackStatus()), dispatch(readCardArtStatus())]);
	};
}

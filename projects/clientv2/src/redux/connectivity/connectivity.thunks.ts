import type { AppThunk } from '../thunk';
import { connectivitySlice } from './connectivitySlice';

/** Reads whether the server can be reached now; connectivity-changed events keep it current after. */
export function loadConnectivity(): AppThunk<void> {
	return function (dispatch, _getState, engine) {
		dispatch(connectivitySlice.actions.changed(engine.connectivity.current()));
	};
}

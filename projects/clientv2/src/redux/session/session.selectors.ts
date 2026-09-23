import type { RootState } from '../root-reducers';
import type { SessionState } from './session.types';

export function selectSession(state: RootState): SessionState {
	return state.session;
}

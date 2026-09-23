import type { RootState } from '../root-reducers';

export function selectAddCards(state: RootState) {
	return state.addCards;
}

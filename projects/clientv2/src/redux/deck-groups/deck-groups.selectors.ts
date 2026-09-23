import type { RootState } from '../root-reducers';

export function selectDeckGroups(state: RootState) {
	return state.deckGroups.groups;
}
export function selectDeckGroupsError(state: RootState) {
	return state.deckGroups.error;
}

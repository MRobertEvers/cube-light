import type { RootState } from '../root-reducers';

export function selectHistoryModal(state: RootState) {
	return state.historyModal.entry;
}

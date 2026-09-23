import { createAppThunk, type AppThunk } from '../thunk';
import type { DeckGroup } from '../../domain/models/deck';
import { deckGroupsSlice } from './deckGroupsSlice';

export const loadDeckGroups = createAppThunk('deckGroups/load', async function (_input: void, api) {
	const { value, revision } = await api.extra.profile.deckGroups();
	return { data: value, revision };
});

/** Replaces every deck group, then puts the saved groups in the store. */
export function saveDeckGroups(groups: DeckGroup[]): AppThunk<Promise<void>> {
	return async function (dispatch, _getState, engine) {
		await engine.profile.setDeckGroups(groups);
		const saved = await engine.profile.deckGroups();
		dispatch(deckGroupsSlice.actions.received({ data: saved.value, revision: saved.revision }));
	};
}

/** Rereads the groups from this device after a change event, once they have been loaded. */
export function refreshLocalDeckGroups(): AppThunk<Promise<void>> {
	return async function (dispatch, getState, engine) {
		if (getState().deckGroups.groups === null) return;
		const saved = await engine.profile.deckGroups();
		dispatch(deckGroupsSlice.actions.received({ data: saved.value, revision: saved.revision }));
	};
}

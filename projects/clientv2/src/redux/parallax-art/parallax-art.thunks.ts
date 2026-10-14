import { createAppThunk, type AppThunk } from '../thunk';
import { parallaxArtSlice } from './parallaxArtSlice';

export const loadParallaxArt = createAppThunk('parallaxArt/load', async function (_input: void, api) {
	const { value, revision } = await api.extra.profile.parallaxArt();
	return { data: value, revision };
});

/** Saves the preference on the profile, then puts the saved value in the store. */
export function saveParallaxArt(enabled: boolean): AppThunk<Promise<void>> {
	return async function (dispatch, _getState, engine) {
		await engine.profile.setParallaxArt(enabled);
		const saved = await engine.profile.parallaxArt();
		dispatch(parallaxArtSlice.actions.received({ data: saved.value, revision: saved.revision }));
	};
}

/** Rereads the preference after a change event (another device may have set it), once it has been loaded. */
export function refreshLocalParallaxArt(): AppThunk<Promise<void>> {
	return async function (dispatch, getState, engine) {
		if (getState().parallaxArt.enabled === null) return;
		const saved = await engine.profile.parallaxArt();
		dispatch(parallaxArtSlice.actions.received({ data: saved.value, revision: saved.revision }));
	};
}

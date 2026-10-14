import type { RootState } from '../root-reducers';

/** Whether card art is to be drawn with depth where it can be (false until the profile has been read). */
export function selectParallaxArt(state: RootState) {
	return state.parallaxArt.enabled === true;
}

/** The saved preference, or null until the profile has been read (a setting is not shown as off before then). */
export function selectParallaxArtSetting(state: RootState) {
	return state.parallaxArt.enabled;
}

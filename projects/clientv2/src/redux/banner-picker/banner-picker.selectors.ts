import type { RootState } from '../root-reducers';

export function selectBannerPicker(state: RootState) {
	return state.bannerPicker;
}

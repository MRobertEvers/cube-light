import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { loadParallaxArt } from './parallax-art.thunks';
import type { ParallaxArtState } from './parallax-art.types';

const initialState: ParallaxArtState = {
	enabled: null,
	revision: 0
};

export const parallaxArtSlice = createSlice({
	name: 'parallaxArt',
	initialState,
	reducers: {
		received: function (state, action: PayloadAction<{ data: boolean; revision: number }>) {
			if (action.payload.revision < state.revision) return;
			state.enabled = action.payload.data;
			state.revision = action.payload.revision;
		}
	},
	extraReducers: function (builder) {
		builder.addCase(loadParallaxArt.fulfilled, (state, action) => {
			if (action.payload.revision < state.revision) return;
			state.enabled = action.payload.data;
			state.revision = action.payload.revision;
		});
	}
});

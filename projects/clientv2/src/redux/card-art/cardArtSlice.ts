import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardArtState } from './card-art.types';

const initialState: CardArtState = {
	installed: false
};

export const cardArtSlice = createSlice({
	name: 'cardArt',
	initialState,
	reducers: {
		installedChanged: function (state, action: PayloadAction<boolean>) {
			state.installed = action.payload;
		}
	}
});

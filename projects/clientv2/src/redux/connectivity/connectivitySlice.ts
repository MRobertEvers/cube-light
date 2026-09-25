import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Connectivity } from '../../domain/models/connectivity';
import type { ConnectivityState } from './connectivity.types';

const initialState: ConnectivityState = {
	connectivity: 'online'
};

export const connectivitySlice = createSlice({
	name: 'connectivity',
	initialState,
	reducers: {
		changed: function (state, action: PayloadAction<Connectivity>) {
			state.connectivity = action.payload;
		}
	}
});

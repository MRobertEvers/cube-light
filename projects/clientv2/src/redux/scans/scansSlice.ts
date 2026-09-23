import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ImageScanTask } from '../../domain/scans/image-scan-task';
import type { WorkItem } from '../../domain/models/work';
import type { ScansState } from './scans.types';

const initialState: ScansState = { scans: [], workItems: null, workError: false };

export const scansSlice = createSlice({
	name: 'scans',
	initialState,
	reducers: {
		scansChanged: function (state, action: PayloadAction<ImageScanTask[]>) {
			state.scans = action.payload;
		},
		workQueueChanged: function (state, action: PayloadAction<{ items: WorkItem[] | null; error: boolean }>) {
			state.workItems = action.payload.items;
			state.workError = action.payload.error;
		}
	}
});

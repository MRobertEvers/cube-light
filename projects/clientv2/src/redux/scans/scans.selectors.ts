import type { RootState } from '../root-reducers';
import type { ImageScanTask } from '../../domain/scans/image-scan-task';
import type { WorkItem } from '../../domain/models/work';

export function selectScans(state: RootState): ImageScanTask[] {
	return state.scans.scans;
}

/** Photos queued for a desktop; null until the first read. */
export function selectWorkItems(state: RootState): WorkItem[] | null {
	return state.scans.workItems;
}

export function selectWorkError(state: RootState): boolean {
	return state.scans.workError;
}

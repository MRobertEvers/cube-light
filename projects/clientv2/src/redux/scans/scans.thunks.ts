import type { CardImagePipeline } from '../../domain/scans/image-scan-pipelines';
import type { WorkItem } from '../../domain/models/work';
import type { AppThunk } from '../thunk';

/** Phones and tablets scan slowly; photos taken there are better queued for a desktop. */
export function scansAreSlowHere(): AppThunk<boolean> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.scansAreSlowHere();
	};
}

/** Scans the photo on this device. Returns the scan's id. */
export function scanPhoto(deckId: string, photo: File, pipeline: CardImagePipeline): AppThunk<string> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.scanPhoto(deckId, photo, pipeline);
	};
}

/** Saves the photo for the next desktop visit to scan. */
export function queueForDesktop(deckId: string, photo: File, pipeline: CardImagePipeline): AppThunk<Promise<WorkItem>> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.queueForDesktop(deckId, photo, pipeline);
	};
}

/** Claims a queued photo and scans it here. Null when another device got to it first. */
export function runQueuedScan(item: WorkItem): AppThunk<Promise<string | null>> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.runQueued(item);
	};
}

/** Picks up queued photos on this device while signed in. Returns a stop function. */
export function runQueuedScansHere(): AppThunk<() => void> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.runQueuedScansHere();
	};
}

/** Keeps redux/scans.workItems current until the returned function is called. */
export function watchWorkQueue(): AppThunk<() => void> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.watchQueue();
	};
}

export function addScanCandidate(scanId: string, name: string, count: number): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.addCandidate(scanId, name, count);
	};
}

export function dismissScan(scanId: string): AppThunk<void> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.dismiss(scanId);
	};
}

export function retryWork(workId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.retry(workId);
	};
}

export function removeWork(workId: string): AppThunk<Promise<void>> {
	return function (_dispatch, _getState, engine) {
		return engine.scans.remove(workId);
	};
}

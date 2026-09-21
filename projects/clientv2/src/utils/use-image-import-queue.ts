import { useSyncExternalStore } from 'react';
import { imageImportQueue } from './image-import-queue';

export function useImageImportQueue() {
	return useSyncExternalStore(imageImportQueue.subscribe, imageImportQueue.getSnapshot);
}

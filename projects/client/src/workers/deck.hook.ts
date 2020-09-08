import { useMemo, useEffect } from 'react';
import { DeckWorkerCommand, DeckWorkerResponse } from './deck.types';

/**
 * The worker-plugin requires the Worker(path) in order to package it correctly.
 *
 * This hook is to capture that and provide types for the postmessage.
 */
export function useDeckWorker(onmessage: (e: DeckWorkerResponse) => void): (message: DeckWorkerCommand) => void {
	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') return new Worker('./deck.worker.ts', { type: 'module' });
	}, []);
	useEffect(() => {
		if (!worker) {
			return;
		}
		worker.onmessage = (e: MessageEvent) => onmessage(e.data);
		return () => {
			worker.terminate();
		};
	}, [worker]);

	return (message: DeckWorkerCommand) => {
		worker.postMessage(message);
	};
}

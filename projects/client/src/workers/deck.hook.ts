import { useMemo, useEffect } from 'react';
import { DeckWorkerCommand, DeckWorkerResponse } from './deck.types';

const WORKER_NAME = 'DECK_WORKER';

/**
 * The worker-plugin requires the Worker(path) in order to package it correctly.
 *
 * This hook is to capture that and provide types for the postmessage.
 *
 * Additionally, this captures the worker in a global so that it can be referenced in more
 * than one component without duplication.
 *
 * THIS IS SAFE TO CALL MORE THAN ONCE!
 */
export function useDeckWorker(onmessage: (e: DeckWorkerResponse) => void): (message: DeckWorkerCommand) => void {
	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') {
			if (!window[WORKER_NAME]) {
				const newWorker = new Worker('./deck.worker.ts', { type: 'module' });

				window[WORKER_NAME] = newWorker;
				window[WORKER_NAME].references = 0;
			}

			return window[WORKER_NAME];
		}
	}, []);

	useEffect(() => {
		if (!worker) {
			return;
		}
		window[WORKER_NAME].references += 1;

		worker.onmessage = (e: MessageEvent) => onmessage(e.data);

		return () => {
			window[WORKER_NAME].references -= 1;

			if (window[WORKER_NAME].references === 0) {
				worker.terminate();
				delete window[WORKER_NAME];
			}
		};
	}, [worker]);

	return (message: DeckWorkerCommand) => {
		worker.postMessage(message);
	};
}

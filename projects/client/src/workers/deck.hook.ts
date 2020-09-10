import { useMemo, useEffect } from 'react';
import { DeckWorkerCommand, DeckWorkerResponse } from './deck.types';

type DeckWorkerOnMessage = (e: DeckWorkerResponse) => void;

const globalWorker: {
	worker?: Worker;
	listeners: Set<DeckWorkerOnMessage>;
} = {
	listeners: new Set()
};

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
export function useDeckWorker(onmessage: DeckWorkerOnMessage): (message: DeckWorkerCommand) => void {
	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') {
			if (!globalWorker.worker) {
				globalWorker.worker = new Worker('./deck.worker.ts', { type: 'module' });
				globalWorker.listeners = new Set();
			}

			return globalWorker.worker;
		}
	}, []);

	useEffect(() => {
		if (!worker) {
			return;
		}
		const newListener = onmessage;

		globalWorker.listeners.add(newListener);

		worker.onmessage = (e: MessageEvent) => {
			for (const listener of globalWorker.listeners) {
				listener(e.data);
			}
		};

		return () => {
			globalWorker.listeners.delete(newListener);

			if (globalWorker.listeners.size === 0) {
				worker.terminate();
				delete globalWorker.worker;
			}
		};
	}, [worker]);

	return (message: DeckWorkerCommand) => {
		worker.postMessage(message);
	};
}

import { useMemo, useEffect } from 'react';
import { OnMessageResponseHandler, Message } from './utils/messageToolkit';

const globalWorker: {
	worker?: Worker;
	listeners: Set<OnMessageResponseHandler>;
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
export function useDeckWorker(
	onmessage: OnMessageResponseHandler
): <T, R>(message: Message<T, R>) => void {
	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') {
			if (!globalWorker.worker) {
				// The worker-plugin requires the Worker(path) in order to package it correctly.
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

	return <T, R>(message: Message<T, R>) => {
		if (worker !== undefined) {
			worker.postMessage(message);
		}
	};
}

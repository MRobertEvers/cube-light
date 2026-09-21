import { useMemo, useEffect, useRef } from 'react';
import { OnMessageResponseHandler, Message } from './utils/messageToolkit';

const globalWorker: {
	worker?: Worker;
	listeners: Set<OnMessageResponseHandler>;
} = {
	listeners: new Set()
};

/**
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
	const onmessageRef = useRef(onmessage);
	onmessageRef.current = onmessage;

	const worker = useMemo(() => {
		if (typeof Worker !== 'undefined') {
			if (!globalWorker.worker) {
				globalWorker.worker = new Worker(
					new URL('./deck.worker.ts', import.meta.url),
					{
						type: 'module'
					}
				);
				globalWorker.listeners = new Set();
			}

			return globalWorker.worker;
		}
	}, []);

	useEffect(() => {
		if (!worker) {
			return;
		}
		const newListener: OnMessageResponseHandler = (message) =>
			onmessageRef.current(message);

		globalWorker.listeners.add(newListener);

		worker.onmessage = (e: MessageEvent) => {
			for (const listener of globalWorker.listeners) {
				listener(e.data);
			}
		};

		return () => {
			globalWorker.listeners.delete(newListener);
			queueMicrotask(() => {
				if (
					globalWorker.listeners.size === 0 &&
					globalWorker.worker === worker
				) {
					worker.terminate();
					delete globalWorker.worker;
				}
			});
		};
	}, [worker]);

	return <T, R>(message: Message<T, R>) => {
		if (worker !== undefined) {
			worker.postMessage(message);
		}
	};
}

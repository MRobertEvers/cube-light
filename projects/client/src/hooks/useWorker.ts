import { useEffect, useMemo } from 'react';

/**
 * This function must take a worker creator because the 'worker-plugin'
 * looks for `Worker('path/to/worker')` in order to determine which
 * @param workerCreator Worker creator
 */
export function useWorker(workerCreator: () => Worker) {
	const worker = useMemo(workerCreator, []);
	useEffect(() => {
		if (!worker) {
			return;
		}

		return () => {
			worker.terminate();
		};
	});

	return worker;
}

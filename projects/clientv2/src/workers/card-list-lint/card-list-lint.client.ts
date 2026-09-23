import type { CardListProblem } from '../../domain/card-names/card-list-problem';
import type { CardListLinter } from '../../engine/ports';
import type { CardListLintRequest, CardListLintResponse } from './card-list-lint.protocol';

type Waiting = { resolve: (value: never) => void; reject: (error: Error) => void };

/**
 * The main-thread binding to CardListLintWorker. One worker serves the page, so the name
 * index loads once however often the list editor opens. A worker that fails is dropped,
 * so the next prepare starts a fresh one.
 */
export class CardListLintWorkerClient implements CardListLinter {
	private worker: Worker | null = null;
	private ready: Promise<void> | null = null;
	private readonly waiting = new Map<number, Waiting>();
	private nextId = 1;

	prepare(indexBytes: ArrayBuffer): Promise<void> {
		if (this.ready) return this.ready;
		const worker = new Worker(new URL('./card-list-lint.worker.ts', import.meta.url), { type: 'module' });
		this.worker = worker;
		const ready = new Promise<void>((resolve, reject) => {
			worker.onmessage = (event: MessageEvent<CardListLintResponse>) => {
				const message = event.data;
				if (message.kind === 'ready') resolve();
				else if (message.kind === 'failed') {
					reject(new Error(message.error));
					this.fail(worker, new Error(message.error));
				} else this.answer(message.id, message.kind === 'analysis' ? message.problems : message.names);
			};
			worker.onerror = () => {
				const error = new Error('The card checker stopped.');
				reject(error);
				this.fail(worker, error);
			};
		});
		this.ready = ready;
		this.post({ kind: 'initialize', indexBytes }, [indexBytes]);
		return ready;
	}

	analyze(text: string): Promise<CardListProblem[]> {
		return this.request((id) => ({ kind: 'analyze', id, text }));
	}

	complete(query: string): Promise<string[]> {
		return this.request((id) => ({ kind: 'complete', id, query }));
	}

	private request<T>(message: (id: number) => CardListLintRequest): Promise<T> {
		if (!this.worker) return Promise.reject(new Error('The card checker has not started.'));
		const id = this.nextId++;
		return new Promise<T>((resolve, reject) => {
			this.waiting.set(id, { resolve: resolve as (value: never) => void, reject });
			this.post(message(id));
		});
	}

	private answer(id: number, value: unknown) {
		const waiting = this.waiting.get(id);
		this.waiting.delete(id);
		waiting?.resolve(value as never);
	}

	private fail(worker: Worker, error: Error) {
		worker.terminate();
		if (this.worker !== worker) return;
		this.worker = null;
		this.ready = null;
		for (const waiting of this.waiting.values()) waiting.reject(error);
		this.waiting.clear();
	}

	private post(message: CardListLintRequest, transfer?: Transferable[]) {
		this.worker?.postMessage(message, transfer ?? []);
	}
}

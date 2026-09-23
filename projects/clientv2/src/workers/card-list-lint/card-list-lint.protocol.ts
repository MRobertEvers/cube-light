import type { CardListProblem } from '../../domain/card-names/card-list-problem';

/** Messages from CardListLintWorkerClient to CardListLintWorker. */
export type CardListLintRequest =
	| { kind: 'initialize'; indexBytes: ArrayBuffer }
	| { kind: 'analyze'; id: number; text: string }
	| { kind: 'complete'; id: number; query: string };
/** Messages from CardListLintWorker back to its client. */
export type CardListLintResponse =
	| { kind: 'ready' }
	| { kind: 'failed'; error: string }
	| {
			kind: 'analysis';
			id: number;
			text: string;
			problems: CardListProblem[];
	  }
	| { kind: 'completions'; id: number; query: string; names: string[] };

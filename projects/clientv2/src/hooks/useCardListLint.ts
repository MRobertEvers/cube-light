import { useCallback, useEffect, useRef, useState } from 'react';
import type {
	CardListLintRequest,
	CardListLintResponse,
	CardListProblem
} from 'src/workers/card-list-lint.worker';

export type CardListLintStatus = 'loading' | 'ready' | 'failed';
export type CardListCompletions = { query: string; names: string[] };

type Listener = (message: CardListLintResponse) => void;

// One worker per page, so the name index downloads and builds once however often the
// Add cards dialog opens. A failed start is forgotten so the next dialog retries.
let shared: {
	worker: Worker;
	status: CardListLintStatus;
	listeners: Set<Listener>;
} | null = null;
let nextId = 1;

function connect() {
	if (shared) return shared;
	const worker = new Worker(
		new URL('../workers/card-list-lint.worker.ts', import.meta.url),
		{ type: 'module' }
	);
	const connection = {
		worker,
		status: 'loading' as CardListLintStatus,
		listeners: new Set<Listener>()
	};
	function fail() {
		connection.status = 'failed';
		worker.terminate();
		if (shared === connection) shared = null;
	}
	worker.onmessage = function (event: MessageEvent<CardListLintResponse>) {
		if (event.data.kind === 'ready') connection.status = 'ready';
		if (event.data.kind === 'failed') fail();
		for (const listener of connection.listeners) listener(event.data);
	};
	worker.onerror = function () {
		fail();
		for (const listener of connection.listeners)
			listener({ kind: 'failed', error: 'The card checker stopped.' });
	};
	shared = connection;
	return connection;
}

function send(request: CardListLintRequest) {
	return connect().worker.postMessage(request);
}

/**
 * Checks a card list against every known card name in a WebAssembly worker, re-running
 * shortly after each edit, and answers autocomplete queries for the editor.
 */
export function useCardListLint(text: string, delayMsArg?: number) {
	const delayMs = delayMsArg === undefined ? 120 : delayMsArg;

	const [status, setStatus] = useState<CardListLintStatus>(
		() => connect().status
	);
	const [problems, setProblems] = useState<CardListProblem[]>([]);
	const [completions, setCompletions] = useState<CardListCompletions | null>(
		null
	);
	const latest = useRef({ analysis: 0, completion: 0 });

	useEffect(() => {
		const connection = connect();
		setStatus(connection.status);
		const listener: Listener = function listener(message) {
			if (message.kind === 'ready') setStatus('ready');
			else if (message.kind === 'failed') {
				setStatus('failed');
				setProblems([]);
				setCompletions(null);
			} else if (
				message.kind === 'analysis' &&
				message.id === latest.current.analysis
			)
				setProblems(message.problems);
			else if (
				message.kind === 'completions' &&
				message.id === latest.current.completion
			)
				setCompletions({ query: message.query, names: message.names });
		};
		connection.listeners.add(listener);
		return function () {
			connection.listeners.delete(listener);
		};
	}, []);

	useEffect(() => {
		if (status === 'failed') return;
		const id = nextId++;
		latest.current.analysis = id;
		if (!text.trim()) {
			setProblems([]);
			return;
		}
		const timer = window.setTimeout(
			() => send({ kind: 'analyze', id, text }),
			delayMs
		);
		return function () {
			return window.clearTimeout(timer);
		};
	}, [text, delayMs, status]);

	/** Asks for names completing `query`; null clears the current completions. */
	const requestCompletions = useCallback(
		(query: string | null) => {
			const id = nextId++;
			latest.current.completion = id;
			if (query === null || status === 'failed') setCompletions(null);
			else send({ kind: 'complete', id, query });
		},
		[status]
	);

	return { status, problems, completions, requestCompletions };
}

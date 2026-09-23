import { useCallback, useEffect, useRef, useState } from 'react';
import type { CardListProblem } from '../../../domain/card-names/card-list-problem';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { checkCardList, completeCardName, prepareCardListChecks } from '../../../redux/cards/cards.thunks';

export type CardListLintStatus = 'loading' | 'ready' | 'failed';
export type CardListCompletions = { query: string; names: string[] };

/**
 * Checks a card list against every known card name, re-running shortly after each edit,
 * and answers autocomplete queries for the editor. Only the newest answer of each kind is
 * shown, so a slow check never overwrites a newer one.
 */
export function useCardListLint(text: string, delayMsArg?: number) {
	const delayMs = delayMsArg === undefined ? 120 : delayMsArg;

	const dispatch = useAppDispatch();
	const [status, setStatus] = useState<CardListLintStatus>('loading');
	const [analysis, setAnalysis] = useState<{ text: string; problems: CardListProblem[] } | null>(null);
	const [completions, setCompletions] = useState<CardListCompletions | null>(null);
	const latest = useRef({ analysis: 0, completion: 0 });

	useEffect(() => {
		let active = true;
		dispatch(prepareCardListChecks()).then(
			() => {
				if (active) setStatus('ready');
			},
			() => {
				if (!active) return;
				setStatus('failed');
				setCompletions(null);
			}
		);
		return function () {
			active = false;
		};
	}, [dispatch]);

	useEffect(() => {
		if (status !== 'ready') return;
		const id = ++latest.current.analysis;
		if (!text.trim()) return;
		const timer = window.setTimeout(() => {
			dispatch(checkCardList(text)).then(
				(problems) => {
					if (id === latest.current.analysis) setAnalysis({ text, problems });
				},
				() => setStatus('failed')
			);
		}, delayMs);
		return function () {
			return window.clearTimeout(timer);
		};
	}, [dispatch, text, delayMs, status]);

	/** Asks for names completing `query`; null clears the current completions. */
	const requestCompletions = useCallback(
		(query: string | null) => {
			const id = ++latest.current.completion;
			if (query === null || status !== 'ready') {
				setCompletions(null);
				return;
			}
			dispatch(completeCardName(query)).then(
				(names) => {
					if (id === latest.current.completion) setCompletions({ query, names });
				},
				() => undefined
			);
		},
		[dispatch, status]
	);

	const problems = status === 'ready' && analysis?.text === text ? analysis.problems : [];
	return { status, problems, completions, requestCompletions };
}

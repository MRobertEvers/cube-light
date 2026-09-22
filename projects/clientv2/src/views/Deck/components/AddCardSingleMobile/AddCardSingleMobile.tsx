import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertIcon } from '../../../../components/Icons/AlertIcon';
import { EnterIcon } from '../../../../components/Icons/EnterIcon';
import { Spinner } from '../../../../components/Spinner/Spinner';
import { Counter } from '../../../../components/Counter/Counter';
import { SuggestionInput } from '../../../../components/SuggestionInput/SuggestionInput';
import { useAsyncReducer } from '../../../../hooks/useAsyncReducer';
import { loadDeck } from '../../../../store/decks/decks.state';
import { useAppDispatch } from '../../../../store/use-app-dispatch';
import { waitForMinimumStatusDuration } from '../../../../utils/minimum-status-duration';
import { useDeckWorker } from '../../../../workers/deck.hook';
import { DeckWorkerMessages } from '../../../../workers/deck.worker.messages';
import { createResponseHandler } from '../../../../workers/utils/messageToolkit';
import {
	Actions,
	initialState,
	reducerAddCard
} from '../AddCard/add-card-state';
import { AddCardEventType, type AddCardEvent } from '../AddCard/AddCard';

import styles from './add-card-single-mobile.module.css';

type AddCardSingleMobileProps = {
	deckId: string;
	onEvent: (event: AddCardEvent) => void;
};

/** Compact phone dialog for adding one card name at a time. */
export function AddCardSingleMobile(props: AddCardSingleMobileProps) {
	const { deckId, onEvent } = props;
	const storeDispatch = useAppDispatch();
	const [state, dispatch] = useAsyncReducer(reducerAddCard, initialState);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [keepAdding, setKeepAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const form = useRef<HTMLFormElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const requestId = useRef(0);
	const query = useRef('');
	const submitStartedAt = useRef(0);
	const submittedName = useRef('');
	const keepAddingRef = useRef(false);
	const warmedSuggestions = useRef(false);
	const errorId = useId();
	const statusId = useId();
	const {
		suggestionsData: suggestions,
		viewIsDropDownVisible,
		viewAddItemText,
		viewAddItemCount
	} = state;

	keepAddingRef.current = keepAdding;

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		input.current?.focus();
		return function () {
			return previousFocus?.focus();
		};
	}, []);

	const workerResponseHandler = useMemo(
		() =>
			createResponseHandler((builder) => {
				builder.addCase(
					DeckWorkerMessages.getSuggestions,
					async (response) => {
						const {
							query: responseQuery,
							requestId: responseRequestId,
							sorted,
							set,
							error: searchError
						} = response.payload;
						if (
							responseRequestId !== requestId.current ||
							responseQuery !== query.current
						)
							return;
						if (
							responseRequestId !== requestId.current ||
							responseQuery !== query.current
						)
							return;
						dispatch(Actions.setSuggestionsData({ sorted, set }));
						setIsSearching(false);
						if (searchError)
							setError(
								'Unable to search cards. Please try again.'
							);
						dispatch(
							Actions.setViewIsDropDownVisible(
								sorted.length > 0 &&
									document.activeElement === input.current
							)
						);
					}
				);
				builder.addCase(
					DeckWorkerMessages.addCard,
					async (response) => {
						if (!response.payload) {
							await waitForMinimumStatusDuration(
								submitStartedAt.current
							);
							setIsSubmitting(false);
							setError(
								'Unable to add this card. Please try again.'
							);
							return;
						}
						await storeDispatch(loadDeck(deckId));
						await waitForMinimumStatusDuration(
							submitStartedAt.current
						);
						if (!keepAddingRef.current) {
							onEvent({ type: AddCardEventType.SUBMIT });
							return;
						}
						requestId.current += 1;
						query.current = '';
						dispatch(Actions.setViewAddItemText(''));
						dispatch(Actions.setViewAddItemCount(1));
						dispatch(
							Actions.setSuggestionsData({
								sorted: [],
								set: new Set()
							})
						);
						dispatch(Actions.setViewIsDropDownVisible(false));
						setIsSubmitting(false);
						setStatus(`${submittedName.current} added.`);
						requestAnimationFrame(() => input.current?.focus());
					}
				);
				return builder;
			}),
		[deckId, dispatch, onEvent, storeDispatch]
	);
	const postToWorker = useDeckWorker(workerResponseHandler);
	useEffect(() => {
		if (warmedSuggestions.current) return;
		warmedSuggestions.current = true;
		postToWorker(
			DeckWorkerMessages.getSuggestions({ query: '', requestId: -1 })
		);
	}, [postToWorker]);
	const exactMatch = suggestions.sorted.find(
		(suggestion) =>
			suggestion.toLowerCase() === viewAddItemText.trim().toLowerCase()
	);
	const resolvedCardName =
		!isSearching && (exactMatch || suggestions.sorted.length === 1)
			? (exactMatch ?? suggestions.sorted[0])
			: null;
	const canSubmit = Boolean(resolvedCardName) && !isSubmitting;

	function close() {
		if (!isSubmitting) onEvent({ type: AddCardEventType.CLOSE });
	}

	function selectSuggestion(suggestion: string, keepFocusArg?: boolean) {
		const keepFocus = keepFocusArg === undefined ? true : keepFocusArg;

		requestId.current += 1;
		query.current = suggestion;
		dispatch(Actions.setViewAddItemText(suggestion));
		dispatch(
			Actions.setSuggestionsData({
				sorted: [suggestion],
				set: new Set([suggestion.toLowerCase()])
			})
		);
		dispatch(Actions.setViewIsDropDownVisible(false));
		setIsSearching(false);
		setError(null);
		setStatus(null);
		if (keepFocus) input.current?.focus();
	}

	function changeQuery(nextQuery: string) {
		query.current = nextQuery;
		requestId.current += 1;
		dispatch(Actions.setViewAddItemText(nextQuery));
		setError(null);
		setStatus(null);
		if (!nextQuery.trim()) {
			setIsSearching(false);
			dispatch(
				Actions.setSuggestionsData({ sorted: [], set: new Set() })
			);
			dispatch(Actions.setViewIsDropDownVisible(false));
			return;
		}
		setIsSearching(true);
		dispatch(
			Actions.setViewIsDropDownVisible(suggestions.sorted.length > 0)
		);
		postToWorker(
			DeckWorkerMessages.getSuggestions({
				query: nextQuery,
				requestId: requestId.current
			})
		);
	}

	function submitCard() {
		if (!resolvedCardName || isSubmitting) {
			input.current?.focus();
			return;
		}
		submittedName.current = resolvedCardName;
		setIsSubmitting(true);
		submitStartedAt.current = performance.now();
		setError(null);
		setStatus(null);
		dispatch(Actions.setViewIsDropDownVisible(false));
		postToWorker(
			DeckWorkerMessages.addCard({
				deckId,
				cardName: resolvedCardName,
				count: viewAddItemCount
			})
		);
	}

	return (
		<form
			ref={form}
			className={styles.dialog}
			role="dialog"
			aria-modal="true"
			aria-busy={isSubmitting}
			aria-labelledby="mobile-add-card-title"
			onSubmit={(event) => {
				event.preventDefault();
				submitCard();
			}}
			onKeyDown={(event) => {
				if (event.key === 'Escape' && !viewIsDropDownVisible) close();
				if (event.key !== 'Tab') return;
				const focusable = Array.from(
					form.current?.querySelectorAll<HTMLElement>(
						'input:not(:disabled), button:not(:disabled)'
					) ?? []
				);
				if (event.shiftKey && document.activeElement === focusable[0]) {
					event.preventDefault();
					focusable[focusable.length - 1]?.focus();
				} else if (
					!event.shiftKey &&
					document.activeElement === focusable[focusable.length - 1]
				) {
					event.preventDefault();
					focusable[0]?.focus();
				}
			}}
		>
			<header className={styles.header}>
				<h2 id="mobile-add-card-title">Add a card</h2>
				<button
					type="button"
					className={styles.close}
					aria-label="Close add a card"
					disabled={isSubmitting}
					onClick={close}
				>
					×
				</button>
			</header>
			<div className={styles.field}>
				<label htmlFor="mobile-add-card-name">Card name</label>
				<SuggestionInput
					id="mobile-add-card-name"
					inputRef={input}
					value={viewAddItemText}
					suggestions={suggestions.sorted}
					open={viewIsDropDownVisible}
					onOpenChange={(open) =>
						dispatch(Actions.setViewIsDropDownVisible(open))
					}
					onChange={changeQuery}
					onSelect={selectSuggestion}
					enterSelects={
						suggestions.sorted.length === 1 && !exactMatch
							? suggestions.sorted[0]
							: undefined
					}
					tabSelects={
						suggestions.sorted.length === 1
							? suggestions.sorted[0]
							: undefined
					}
					placeholder="Card name"
					disabled={isSubmitting}
					indicator={
						isSearching ? (
							<Spinner />
						) : viewAddItemText ? (
							resolvedCardName ? (
								<EnterIcon />
							) : (
								<AlertIcon />
							)
						) : null
					}
					listLabel="Card suggestions"
					aria-describedby={
						error ? errorId : status ? statusId : undefined
					}
					aria-invalid={Boolean(error)}
				/>
				{error && (
					<p id={errorId} className={styles.error} role="alert">
						{error}
					</p>
				)}
				{status && (
					<p id={statusId} className={styles.status} role="status">
						{status}
					</p>
				)}
			</div>
			<div className={styles.countRow}>
				<span>Count</span>
				<Counter
					count={viewAddItemCount}
					setCount={(count) =>
						dispatch(Actions.setViewAddItemCount(count))
					}
				/>
			</div>
			<label className={styles.keepAdding}>
				<span>Keep adding cards</span>
				<input
					type="checkbox"
					role="switch"
					checked={keepAdding}
					disabled={isSubmitting}
					onChange={(event) => setKeepAdding(event.target.checked)}
				/>
				<span className={styles.switch} aria-hidden="true" />
			</label>
			<button
				type="submit"
				className={styles.submit}
				disabled={!canSubmit}
			>
				{isSubmitting ? (
					<>
						<Spinner /> Adding…
					</>
				) : (
					'Add card'
				)}
			</button>
		</form>
	);
}

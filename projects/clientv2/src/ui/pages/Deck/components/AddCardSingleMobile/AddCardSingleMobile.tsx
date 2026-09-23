import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertIcon } from '../../../../kit/components/Icons/AlertIcon';
import { EnterIcon } from '../../../../kit/components/Icons/EnterIcon';
import { Spinner } from '../../../../kit/components/Spinner/Spinner';
import { Counter } from '../../../../kit/components/Counter/Counter';
import { SuggestionInput } from '../../../../kit/components/SuggestionInput/SuggestionInput';
import { useAsyncReducer } from '../../../../kit/hooks/useAsyncReducer';
import { addCardByName } from '../../../../../state/decks/decks.state';
import { searchCardNames } from '../../../../../state/card-name-lookup/card-name-lookup.actions';
import { useAppDispatch } from '../../../../../state/use-app-dispatch';
import {
	Actions,
	initialState,
	reducerAddCard
} from '../AddCard/add-card-state';
import { DECK_BOARD_ORDER } from '../../../../../domain/deck/boards';
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
	const focusSubmitAfterSelect = useRef(false);
	const requestId = useRef(0);
	const query = useRef('');
	const submittedName = useRef('');
	const keepAddingRef = useRef(false);
	const warmedSuggestions = useRef(false);
	const errorId = useId();
	const statusId = useId();
	const {
		suggestionsData: suggestions,
		viewIsDropDownVisible,
		viewAddItemText,
		viewAddItemCounts
	} = state;
	const totalCount = viewAddItemCounts.main + viewAddItemCounts.side;

	keepAddingRef.current = keepAdding;

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		input.current?.focus();
		return function () {
			return previousFocus?.focus();
		};
	}, []);

	/** Shows the names matching `nextQuery`, unless the user has typed on since asking. */
	function search(nextQuery: string, id: number) {
		function show(sorted: string[], failed: boolean) {
			if (id !== requestId.current || nextQuery !== query.current) return;
			dispatch(
				Actions.setSuggestionsData({
					sorted,
					set: new Set(sorted.map((name) => name.toLowerCase()))
				})
			);
			setIsSearching(false);
			if (failed) setError('Unable to search cards. Please try again.');
			dispatch(
				Actions.setViewIsDropDownVisible(
					sorted.length > 0 && document.activeElement === input.current
				)
			);
		}
		storeDispatch(searchCardNames(nextQuery))
			.unwrap()
			.then(
				(sorted) => show(sorted, false),
				() => show([], true)
			);
	}

	/** After a card is saved: close, or clear the form for the next card. */
	function added() {
		if (!keepAddingRef.current) {
			onEvent({ type: AddCardEventType.SUBMIT });
			return;
		}
		requestId.current += 1;
		query.current = '';
		dispatch(Actions.setViewAddItemText(''));
		for (const board of DECK_BOARD_ORDER)
			dispatch(
				Actions.setViewAddItemCount({
					board,
					count: initialState.viewAddItemCounts[board]
				})
			);
		dispatch(Actions.setSuggestionsData({ sorted: [], set: new Set() }));
		dispatch(Actions.setViewIsDropDownVisible(false));
		setIsSubmitting(false);
		setStatus(`${submittedName.current} added.`);
		requestAnimationFrame(() => input.current?.focus());
	}

	useEffect(() => {
		if (warmedSuggestions.current) return;
		warmedSuggestions.current = true;
		// Loads the name index before the first keystroke.
		search('', -1);
	}, []);
	const exactMatch = suggestions.sorted.find(
		(suggestion) =>
			suggestion.toLowerCase() === viewAddItemText.trim().toLowerCase()
	);
	const resolvedCardName =
		!isSearching && (exactMatch || suggestions.sorted.length === 1)
			? (exactMatch ?? suggestions.sorted[0])
			: null;
	const canSubmit =
		Boolean(resolvedCardName) && totalCount > 0 && !isSubmitting;

	function close() {
		if (!isSubmitting) onEvent({ type: AddCardEventType.CLOSE });
	}

	// Tab-choosing a card jumps straight to the submit button once it re-renders enabled.
	useEffect(() => {
		if (!focusSubmitAfterSelect.current) return;
		focusSubmitAfterSelect.current = false;
		const submit = form.current?.querySelector<HTMLButtonElement>(
			'button[type="submit"]'
		);
		if (submit && !submit.disabled) submit.focus();
	});

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
		else focusSubmitAfterSelect.current = true;
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
		search(nextQuery, requestId.current);
	}

	function submitCard() {
		if (!resolvedCardName || isSubmitting) {
			input.current?.focus();
			return;
		}
		if (totalCount === 0) return;
		submittedName.current = resolvedCardName;
		setIsSubmitting(true);
		setError(null);
		setStatus(null);
		dispatch(Actions.setViewIsDropDownVisible(false));
		storeDispatch(
			addCardByName({
				deckId,
				cardName: resolvedCardName,
				counts: viewAddItemCounts
			})
		)
			.unwrap()
			.then(added, () => {
				setIsSubmitting(false);
				setError('Unable to add this card. Please try again.');
			});
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
			{DECK_BOARD_ORDER.map((board) => (
				<div key={board} className={styles.countRow}>
					<span>{board === 'main' ? 'Main deck' : 'Sideboard'}</span>
					<Counter
						count={viewAddItemCounts[board]}
						min={0}
						label={`${board === 'main' ? 'Main deck' : 'Sideboard'} copies`}
						setCount={(count) =>
							dispatch(
								Actions.setViewAddItemCount({ board, count })
							)
						}
					/>
				</div>
			))}
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

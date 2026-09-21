import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Spinner } from '../../../../components/Spinner/Spinner';
import { useDeckWorker } from '../../../../workers/deck.hook';
import EnterIcon from '../../../../components/Icons/EnterIcon';
import AlertIcon from '../../../../components/Icons/AlertIcon';
import { createResponseHandler } from '../../../../workers/utils/messageToolkit';
import { DeckWorkerMessages } from '../../../../workers/deck.worker.messages';
import { Button } from 'src/components/Button/Button';
import { Counter } from 'src/components/Counter/Counter';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';
import { Actions, initialState, reducerAddCard } from './add-card-state';
import { loadDeck } from 'src/store/decks/decks.state';
import { useAppDispatch } from 'src/store/use-app-dispatch';
import styles from './card-adder.module.css';
import { waitForMinimumStatusDuration } from 'src/utils/minimum-status-duration';

export enum AddCardEventType {
	SUBMIT = 'AddCardEvent/SUBMIT',
	CLOSE = 'AddCardEvent/CLOSE'
}

export type AddCardEvent = {
	type: AddCardEventType;
};

export interface AddCardProps {
	deckId: string;
	onEvent: (e: AddCardEvent) => void;
}

export function AddCard(props: AddCardProps) {
	const { deckId, onEvent } = props;
	const storeDispatch = useAppDispatch();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(-1);
	const [state, dispatch] = useAsyncReducer(reducerAddCard, initialState);
	const {
		suggestionsData: suggestions,
		viewIsDropDownVisible,
		viewAddItemText,
		viewAddItemCount
	} = state;
	const dialogRef = useRef<HTMLFormElement>(null);
	const addItemInputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLUListElement>(null);
	const requestIdRef = useRef(0);
	const queryRef = useRef('');
	const searchStartedAt = useRef(0);
	const submitStartedAt = useRef(0);
	const listId = useId();
	const hintId = useId();
	const errorId = useId();

	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		addItemInputRef.current?.focus();
		return () => previousFocus?.focus();
	}, []);

	useEffect(() => {
		if (viewIsDropDownVisible && activeIndex >= 0) {
			(
				suggestionsRef.current?.children[activeIndex] as
					HTMLElement | undefined
			)?.scrollIntoView({ block: 'nearest' });
		}
	}, [activeIndex, viewIsDropDownVisible]);

	const workerResponseHandler = useMemo(() => {
		return createResponseHandler((builder) => {
			builder.addCase(
				DeckWorkerMessages.getSuggestions,
				async (response) => {
					const {
						query,
						requestId,
						sorted,
						set,
						error: searchError
					} = response.payload;
					if (
						requestId !== requestIdRef.current ||
						query !== queryRef.current
					)
						return;
					await waitForMinimumStatusDuration(searchStartedAt.current);
					if (
						requestId !== requestIdRef.current ||
						query !== queryRef.current
					)
						return;
					dispatch(Actions.setSuggestionsData({ sorted, set }));
					setIsSearching(false);
					if (searchError)
						setError('Unable to search cards. Please try again.');
					setActiveIndex(-1);
					dispatch(
						Actions.setViewIsDropDownVisible(
							sorted.length > 0 &&
								document.activeElement ===
									addItemInputRef.current
						)
					);
				}
			);
			builder.addCase(DeckWorkerMessages.addCard, async (response) => {
				if (!response.payload) {
					await waitForMinimumStatusDuration(submitStartedAt.current);
					setIsSubmitting(false);
					setError('Unable to add this card. Please try again.');
					return;
				}
				await storeDispatch(loadDeck(deckId));
				await waitForMinimumStatusDuration(submitStartedAt.current);
				onEvent({ type: AddCardEventType.SUBMIT });
			});
			return builder;
		});
	}, [deckId, dispatch, onEvent, storeDispatch]);

	const postToWorker = useDeckWorker(workerResponseHandler);
	const exactMatch = suggestions.sorted.find(
		(suggestion) =>
			suggestion.toLowerCase() === viewAddItemText.trim().toLowerCase()
	);
	const resolvedCardName =
		!isSearching && (exactMatch || suggestions.sorted.length === 1)
			? (exactMatch ?? suggestions.sorted[0])
			: null;
	const canSubmit = Boolean(resolvedCardName) && !isSubmitting;
	const showSuggestions =
		viewIsDropDownVisible && suggestions.sorted.length > 0;

	function selectSuggestion(suggestion: string, keepFocus = true) {
		requestIdRef.current += 1;
		queryRef.current = suggestion;
		dispatch(Actions.setViewAddItemText(suggestion));
		dispatch(
			Actions.setSuggestionsData({
				sorted: [suggestion],
				set: new Set([suggestion.toLowerCase()])
			})
		);
		dispatch(Actions.setViewIsDropDownVisible(false));
		setIsSearching(false);
		setActiveIndex(-1);
		setError(null);
		if (keepFocus) addItemInputRef.current?.focus();
	}

	function submitCard() {
		if (!resolvedCardName || isSubmitting) {
			addItemInputRef.current?.focus();
			return;
		}
		setIsSubmitting(true);
		submitStartedAt.current = performance.now();
		setError(null);
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
			ref={dialogRef}
			className={styles['dialog']}
			role="dialog"
			aria-modal="true"
			aria-busy={isSubmitting}
			aria-labelledby="add-card-title"
			onSubmit={(event) => {
				event.preventDefault();
				submitCard();
			}}
			onKeyDown={(event) => {
				if (event.key === 'Escape' && !isSubmitting) {
					event.preventDefault();
					onEvent({ type: AddCardEventType.CLOSE });
				}
				if (event.key !== 'Tab') return;
				const focusable = Array.from(
					dialogRef.current?.querySelectorAll<HTMLElement>(
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
			<div className={styles['heading']}>
				<h2 id="add-card-title">Add a card</h2>
				<p>Search for a card, then choose how many to add.</p>
			</div>
			<div className={styles['field']}>
				<label htmlFor="add-card-name">Card name</label>
				<div className={styles['search-field']}>
					<input
						id="add-card-name"
						ref={addItemInputRef}
						role="combobox"
						aria-autocomplete="list"
						aria-expanded={showSuggestions}
						aria-controls={showSuggestions ? listId : undefined}
						aria-activedescendant={
							showSuggestions && activeIndex >= 0
								? `${listId}-${activeIndex}`
								: undefined
						}
						aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
						aria-invalid={Boolean(error)}
						type="search"
						autoComplete="off"
						value={viewAddItemText}
						placeholder="Start typing a card name"
						onFocus={() => {
							if (suggestions.sorted.length > 0)
								dispatch(
									Actions.setViewIsDropDownVisible(true)
								);
						}}
						onBlur={() =>
							dispatch(Actions.setViewIsDropDownVisible(false))
						}
						onChange={(event) => {
							const query = event.target.value;
							queryRef.current = query;
							requestIdRef.current += 1;
							dispatch(Actions.setViewAddItemText(query));
							dispatch(
								Actions.setSuggestionsData({
									sorted: [],
									set: new Set()
								})
							);
							dispatch(Actions.setViewIsDropDownVisible(false));
							setActiveIndex(-1);
							setError(null);
							setIsSearching(Boolean(query.trim()));
							if (query.trim()) {
								searchStartedAt.current = performance.now();
								postToWorker(
									DeckWorkerMessages.getSuggestions({
										query,
										requestId: requestIdRef.current
									})
								);
							}
						}}
						onKeyDown={(event) => {
							if (
								(event.key === 'ArrowDown' ||
									event.key === 'ArrowUp') &&
								suggestions.sorted.length > 0
							) {
								event.preventDefault();
								dispatch(
									Actions.setViewIsDropDownVisible(true)
								);
								setActiveIndex((current) => {
									if (event.key === 'ArrowDown')
										return (
											(current + 1) %
											suggestions.sorted.length
										);
									return current <= 0
										? suggestions.sorted.length - 1
										: current - 1;
								});
							} else if (
								event.key === 'Enter' &&
								showSuggestions &&
								activeIndex >= 0
							) {
								event.preventDefault();
								selectSuggestion(
									suggestions.sorted[activeIndex]
								);
							} else if (
								event.key === 'Enter' &&
								showSuggestions &&
								suggestions.sorted.length === 1 &&
								!exactMatch
							) {
								event.preventDefault();
								selectSuggestion(suggestions.sorted[0]);
							} else if (
								event.key === 'Tab' &&
								!event.shiftKey &&
								showSuggestions &&
								suggestions.sorted.length === 1
							) {
								selectSuggestion(suggestions.sorted[0], false);
							}
						}}
					/>
					<div
						className={styles['search-indicator']}
						aria-hidden="true"
					>
						{isSearching ? (
							<Spinner />
						) : viewAddItemText ? (
							resolvedCardName ? (
								<EnterIcon />
							) : (
								<AlertIcon />
							)
						) : null}
					</div>
					{showSuggestions && (
						<ul
							ref={suggestionsRef}
							id={listId}
							className={styles['suggestions']}
							role="listbox"
							aria-label="Card suggestions"
						>
							{suggestions.sorted.map((suggestion, index) => (
								<li
									id={`${listId}-${index}`}
									key={suggestion}
									role="option"
									aria-selected={index === activeIndex}
									className={
										index === activeIndex
											? styles['active-suggestion']
											: undefined
									}
									onMouseDown={(event) =>
										event.preventDefault()
									}
									onClick={() => selectSuggestion(suggestion)}
								>
									{suggestion}
								</li>
							))}
						</ul>
					)}
				</div>
				<p id={hintId} className={styles['field-hint']}>
					{isSearching
						? 'Searching cards…'
						: viewAddItemText && !resolvedCardName
							? 'Choose a suggestion or enter an exact card name.'
							: 'Use arrow keys to browse suggestions; press Enter to choose.'}
				</p>
				{error && (
					<p id={errorId} className={styles['error']} role="alert">
						{error}
					</p>
				)}
			</div>
			<div className={styles['quantity-row']}>
				<div>
					<span className={styles['quantity-title']}>Main deck</span>
					<span className={styles['quantity-subtitle']}>
						Number of copies
					</span>
				</div>
				<Counter
					count={viewAddItemCount}
					setCount={(count) =>
						dispatch(Actions.setViewAddItemCount(count))
					}
				/>
			</div>
			<div className={styles['modal-buttons']}>
				<Button
					className={styles['cancel-button']}
					disabled={isSubmitting}
					onClick={() => onEvent({ type: AddCardEventType.CLOSE })}
				>
					Cancel
				</Button>
				<Button
					className={styles['add-button']}
					type="submit"
					disabled={!canSubmit}
				>
					{isSubmitting ? (
						<>
							<Spinner /> Adding…
						</>
					) : (
						'Add card'
					)}
				</Button>
			</div>
		</form>
	);
}

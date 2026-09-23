import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Spinner } from '../../../../components/Spinner/Spinner';
import { useDeckWorker } from '../../../../workers/deck.hook';
import { EnterIcon } from '../../../../components/Icons/EnterIcon';
import { AlertIcon } from '../../../../components/Icons/AlertIcon';
import { createResponseHandler } from '../../../../workers/utils/messageToolkit';
import { DeckWorkerMessages } from '../../../../workers/deck.worker.messages';
import { Button } from 'src/components/Button/Button';
import { HeaderBackButton } from 'src/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/components/Header/HeaderBackSlot';
import { Counter } from 'src/components/Counter/Counter';
import { SuggestionInput } from 'src/components/SuggestionInput/SuggestionInput';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';
import { Actions, initialState, reducerAddCard } from './add-card-state';
import { loadDeck } from 'src/store/decks/decks.state';
import { useAppDispatch } from 'src/store/use-app-dispatch';
import styles from './card-adder.module.css';
import { DECK_BOARD_ORDER } from 'src/utils/deck-boards';

const QUANTITY_LABELS = { main: 'Main deck', side: 'Sideboard' } as const;

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
	const [state, dispatch] = useAsyncReducer(reducerAddCard, initialState);
	const {
		suggestionsData: suggestions,
		viewIsDropDownVisible,
		viewAddItemText,
		viewAddItemCounts
	} = state;
	const totalCount = viewAddItemCounts.main + viewAddItemCounts.side;
	const dialogRef = useRef<HTMLFormElement>(null);
	const addItemInputRef = useRef<HTMLInputElement>(null);
	const requestIdRef = useRef(0);
	const queryRef = useRef('');
	const warmedSuggestions = useRef(false);
	const hintId = useId();
	const errorId = useId();
	useEffect(() => {
		const previousFocus = document.activeElement as HTMLElement | null;
		addItemInputRef.current?.focus();
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
						if (
							requestId !== requestIdRef.current ||
							query !== queryRef.current
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
									document.activeElement ===
										addItemInputRef.current
							)
						);
					}
				);
				builder.addCase(
					DeckWorkerMessages.addCard,
					async (response) => {
						if (!response.payload) {
							setIsSubmitting(false);
							setError(
								'Unable to add this card. Please try again.'
							);
							return;
						}
						onEvent({ type: AddCardEventType.SUBMIT });
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
	const canSubmit =
		Boolean(resolvedCardName) && totalCount > 0 && !isSubmitting;

	function selectSuggestion(suggestion: string, keepFocusArg?: boolean) {
		const keepFocus = keepFocusArg === undefined ? true : keepFocusArg;

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
		setError(null);
		if (keepFocus) addItemInputRef.current?.focus();
	}

	function submitCard() {
		if (!resolvedCardName || isSubmitting) {
			addItemInputRef.current?.focus();
			return;
		}
		if (totalCount === 0) return;
		setIsSubmitting(true);
		setError(null);
		dispatch(Actions.setViewIsDropDownVisible(false));
		postToWorker(
			DeckWorkerMessages.addCard({
				deckId,
				cardName: resolvedCardName,
				counts: viewAddItemCounts
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
				if (event.key !== 'Tab' || event.defaultPrevented) return;
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
			<header className={styles['top-bar']}>
				<HeaderBackSlot>
					{/* Phones fill the screen and close from the top bar, so Cancel hides. */}
					<HeaderBackButton
						inline
						label="Close add a card"
						onClick={() => {
							if (!isSubmitting)
								onEvent({ type: AddCardEventType.CLOSE });
						}}
					/>
				</HeaderBackSlot>
				<h2 id="add-card-title">Add a card</h2>
			</header>
			<div className={styles['body']}>
				<p className={styles['intro']}>
					Search for a card, then choose how many to add.
				</p>
				<div className={styles['field']}>
					<label htmlFor="add-card-name">Card name</label>
					<SuggestionInput
						id="add-card-name"
						inputRef={addItemInputRef}
						value={viewAddItemText}
						suggestions={suggestions.sorted}
						open={viewIsDropDownVisible}
						onOpenChange={(open) =>
							dispatch(Actions.setViewIsDropDownVisible(open))
						}
						onChange={(query) => {
							queryRef.current = query;
							requestIdRef.current += 1;
							dispatch(Actions.setViewAddItemText(query));
							setError(null);
							if (!query.trim()) {
								setIsSearching(false);
								dispatch(
									Actions.setSuggestionsData({
										sorted: [],
										set: new Set()
									})
								);
								dispatch(
									Actions.setViewIsDropDownVisible(false)
								);
								return;
							}
							setIsSearching(true);
							dispatch(
								Actions.setViewIsDropDownVisible(
									suggestions.sorted.length > 0
								)
							);
							postToWorker(
								DeckWorkerMessages.getSuggestions({
									query,
									requestId: requestIdRef.current
								})
							);
						}}
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
						tabBrowses
						placeholder="Start typing a card name"
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
						aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
						aria-invalid={Boolean(error)}
					/>
					<p id={hintId} className={styles['field-hint']}>
						{isSearching
							? 'Searching cards…'
							: viewAddItemText && !resolvedCardName
								? 'Choose a suggestion or enter an exact card name.'
								: 'Use Tab or arrow keys to browse suggestions; press Enter to choose.'}
					</p>
					{error && (
						<p
							id={errorId}
							className={styles['error']}
							role="alert"
						>
							{error}
						</p>
					)}
				</div>
				<div className={styles['quantities']}>
					{DECK_BOARD_ORDER.map((board) => (
						<div key={board} className={styles['quantity-row']}>
							<div>
								<span className={styles['quantity-title']}>
									{QUANTITY_LABELS[board]}
								</span>
								<span className={styles['quantity-subtitle']}>
									Number of copies
								</span>
							</div>
							<Counter
								count={viewAddItemCounts[board]}
								min={0}
								label={`${QUANTITY_LABELS[board]} copies`}
								setCount={(count) =>
									dispatch(
										Actions.setViewAddItemCount({
											board,
											count
										})
									)
								}
							/>
						</div>
					))}
				</div>
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

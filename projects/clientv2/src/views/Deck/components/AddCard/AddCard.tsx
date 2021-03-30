import React from 'react';
import { useState, useRef, useMemo } from 'react';
import { mutate } from 'swr';
import { Spinner } from '../../../../components/Spinner/Spinner';
import { useDeckWorker } from '../../../../workers/deck.hook';
import EnterIcon from '../../../../components/Icons/EnterIcon';
import AlertIcon from '../../../../components/Icons/AlertIcon';
import { createResponseHandler } from '../../../../workers/utils/messageToolkit';
import { DeckWorkerMessages } from '../../../../workers/deck.worker.messages';
import { Button } from 'src/components/Button/Button';
import { Counter } from 'src/components/Counter/Counter';

import styles from './card-adder.module.css';
import { useOnClickedAway } from 'src/hooks/useOnClickedAway';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';
import { Actions, initialState, reducerAddCard } from './add-card-state';

const KEY = {
	BACKSPACE: 8,
	COMMA: 188,
	DELETE: 46,
	DOWN: 40,
	END: 35,
	ENTER: 13,
	ESCAPE: 27,
	HOME: 36,
	LEFT: 37,
	NUMPAD_ADD: 107,
	NUMPAD_DECIMAL: 110,
	NUMPAD_DIVIDE: 111,
	NUMPAD_ENTER: 108,
	NUMPAD_MULTIPLY: 106,
	NUMPAD_SUBTRACT: 109,
	PAGE_DOWN: 34,
	PAGE_UP: 33,
	PERIOD: 190,
	RIGHT: 39,
	SPACE: 32,
	TAB: 9,
	UP: 38
};

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

	const [isWaiting, setIsWaiting] = useState(false);

	const [state, dispatch] = useAsyncReducer(reducerAddCard, initialState);
	const {
		suggestionsData: suggestions,
		viewIsDropDownVisible,
		viewAddItemText,
		viewAddItemCount
	} = state;

	const comboboxRef = useOnClickedAway(() => {
		dispatch(Actions.setViewIsDropDownVisible(false));
	});

	const addItemInputRef = useRef<HTMLInputElement>(null);
	const itemCountRef = useRef<HTMLSelectElement>(null);

	const workerResponseHandler = useMemo(() => {
		return createResponseHandler((builder) => {
			builder.addCase(DeckWorkerMessages.getSuggestions, (response) => {
				dispatch(Actions.setSuggestionsData(response.payload));
				setIsWaiting(false);
				dispatch(Actions.setViewIsDropDownVisible(true));
			});
			builder.addCase(DeckWorkerMessages.addCard, async (response) => {
				if (addItemInputRef.current) {
					addItemInputRef.current.focus();
				}
				dispatch(Actions.setViewAddItemText(''));
				dispatch(Actions.setSuggestionsData({ sorted: [], set: new Set() }));
				setIsWaiting(false);
				await mutate(deckId);
				onEvent({ type: AddCardEventType.SUBMIT });
			});
			return builder;
		});
	}, []);

	const postToWorker = useDeckWorker(workerResponseHandler);

	let isOkToSubmit = false;
	let comboboxIndicator;
	if (isWaiting) {
		comboboxIndicator = <Spinner />;
	} else if (viewAddItemText) {
		if (suggestions.set.size === 1 || suggestions.set.has(viewAddItemText.toLowerCase())) {
			isOkToSubmit = true;
			comboboxIndicator = <EnterIcon className={styles['combobox-input-alert']} />;
		} else {
			comboboxIndicator = <AlertIcon className={styles['combobox-input-alert']} />;
		}
	} else {
		comboboxIndicator = null;
	}

	return (
		<div className={styles['combobox']}>
			<div className={styles['combobox-bar']}>
				<div ref={comboboxRef} className={styles['combobox-input']}>
					<div className={styles['combobox-submit']}>{comboboxIndicator}</div>
					<input
						ref={addItemInputRef}
						onKeyDown={(e) => {
							if (e.which === KEY.TAB && suggestions.sorted.length === 1) {
								dispatch(Actions.setViewAddItemText(suggestions.sorted[0]));
							}
						}}
						tabIndex={1}
						type="search"
						value={viewAddItemText}
						placeholder="Card name"
						onChange={(e) => {
							const newText = e.target.value;
							dispatch(Actions.setViewAddItemText(newText));
							postToWorker(DeckWorkerMessages.getSuggestions(newText));
						}}
					/>
					{viewIsDropDownVisible && (
						<ul className={styles['suggestions']}>
							{suggestions.sorted.map((suggestion, index) => (
								<li
									tabIndex={index + 1}
									key={suggestion}
									onClick={() => {
										dispatch(Actions.setViewAddItemText(suggestion));
										dispatch(Actions.setViewIsDropDownVisible(false));
									}}
									onFocus={() => {
										dispatch(Actions.setViewAddItemText(suggestion));
									}}
									onKeyDown={(e) => {
										if (e.keyCode === KEY.ENTER) {
											if (itemCountRef.current) {
												itemCountRef.current.focus();
											}
										}
									}}
									onKeyDownCapture={(e) => {
										if (e.keyCode === KEY.BACKSPACE) {
											// addItemInputRef.current.focus();
											dispatch(
												Actions.setViewAddItemText(
													viewAddItemText.substr(
														0,
														viewAddItemText.length - 1
													)
												)
											);
											e.preventDefault();
										}
									}}
								>
									{suggestion}
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
			<table className={styles['group-counter']}>
				<tbody>
					<tr>
						<td>
							<span>Main deck</span>
						</td>
						<td>
							<Counter
								count={viewAddItemCount}
								setCount={(c) => dispatch(Actions.setViewAddItemCount(c))}
							/>
						</td>
					</tr>
				</tbody>
			</table>

			<div className={styles['modal-buttons']}>
				<Button
					disabled={!isOkToSubmit}
					onClick={() => {
						setIsWaiting(true);
						postToWorker(
							DeckWorkerMessages.addCard({
								deckId: deckId,
								cardName: viewAddItemText,
								count: viewAddItemCount
							})
						);
					}}
				>
					{isWaiting ? <Spinner /> : 'Ok'}
				</Button>
				<Button onClick={() => onEvent({ type: AddCardEventType.CLOSE })}>Cancel</Button>
			</div>
		</div>
	);
}

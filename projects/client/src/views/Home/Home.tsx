import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { NextPage } from 'next';
import useSWR, { mutate } from 'swr';
import { Page } from '../../components/Page/Page';
import { Spinner } from '../../components/Spinner/Spinner';
import AlertIcon from '../../components/Icons/AlertIcon';
import { useDeckWorker } from '../../workers/deck.hook';
import { DeckWorkerResponse } from '../../workers/deck.types';

import styles from './home.module.css';
import { Decklist } from '../../components/Decklist/Decklist';

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

type DecklistData = { name: string; cards: Array<{ name: string; count: string; image: string }> };
async function fetchDeck(key: string) {
	const result = await fetch('http://localhost:4040/deck/1');
	const data = await result.json();

	return data as DecklistData;
}

export type WorkoutProps = {
	initialDeckData: DecklistData;
};

const Index: NextPage<WorkoutProps> = (props: WorkoutProps) => {
	const { initialDeckData } = props;

	const [suggestions, setSuggestions] = useState({ sorted: [], set: new Set() });
	const [isWaiting, setIsWaiting] = useState(false);
	const addItemInput = useRef(null);
	const [imageSource, setImageSource] = useState(null);

	const { data, error } = useSWR('1', fetchDeck, { initialData: initialDeckData });

	const postToWorker = useDeckWorker((e: DeckWorkerResponse) => {
		if (e.type === 'suggest') {
			setSuggestions(e);
		} else {
			if (addItemInput.current) {
				addItemInput.current.focus();
			}
			setAddItemText('');
			setSuggestions({ sorted: [], set: new Set() });
			mutate('1');
		}

		setIsWaiting(false);
	});

	const [suggestDebounceTimer, setSuggestDebounceTimer] = useState(null);
	const [addItemText, setAddItemText] = useState('');

	let comboboxIndicator;
	if (isWaiting) {
		comboboxIndicator = <Spinner />;
	} else if (addItemText) {
		if (suggestions.set.size === 1 || suggestions.set.has(addItemText.toLowerCase())) {
			comboboxIndicator = (
				<button
					className={styles['submit-button']}
					onClick={() => {
						postToWorker({
							type: 'add',
							cardName: addItemText
						});
						setIsWaiting(true);
					}}
				>
					Submit
				</button>
			);
		} else {
			comboboxIndicator = <AlertIcon className={styles['combobox-input-alert']} />;
		}
	} else {
		comboboxIndicator = null;
	}
	return (
		<Page>
			<div className={styles['index-container-top']}>
				<div className={styles['combobox']}>
					<div className={styles['combobox-input']}>
						<div className={styles['combobox-submit']}>{comboboxIndicator}</div>
						<input
							ref={addItemInput}
							onKeyDown={(e) => {
								if (e.which === 9 && suggestions.sorted.length === 1) {
									setAddItemText(suggestions.sorted[0]);
								}
							}}
							tabIndex={1}
							type="text"
							value={addItemText}
							placeholder="Card name"
							onChange={(e: ChangeEvent<HTMLInputElement>) => {
								const newText = e.target.value;
								setAddItemText(newText);
								if (suggestDebounceTimer) {
									clearTimeout(suggestDebounceTimer);
								}
								const timer = setTimeout(() => {
									if (newText.length > 3) {
										setIsWaiting(true);
										postToWorker({ type: 'suggest', payload: newText });
									} else {
										setSuggestions({ sorted: [], set: new Set() });
									}
								}, 500);
								setSuggestDebounceTimer(timer);
							}}
						/>
					</div>
					<ul className={styles['suggestions']}>
						{suggestions.sorted.map((suggestion, index) => (
							<li
								tabIndex={index + 1}
								key={suggestion}
								onClick={() => {
									setAddItemText(suggestion);
								}}
								onFocus={() => {
									setAddItemText(suggestion);
								}}
								onKeyDown={(e) => {
									if (e.keyCode === KEY.ENTER) {
										postToWorker({
											type: 'add',
											cardName: suggestion
										});
										setIsWaiting(true);
									}
								}}
								onKeyDownCapture={(e) => {
									if (e.keyCode === KEY.BACKSPACE) {
										addItemInput.current.focus();
										setAddItemText((prev) => prev.substr(0, prev.length - 1));
										e.preventDefault();
									}
								}}
							>
								{suggestion}
							</li>
						))}
					</ul>
				</div>
			</div>
			<div className={styles['index-container']}>
				<div>
					<div className={styles['avatar']}>
						<img src={imageSource}></img>
					</div>
				</div>
				{data && (
					<Decklist name={data.name} cards={data.cards} onCardHover={(card) => setImageSource(card.image)} />
				)}
			</div>
		</Page>
	);
};

export async function getServerSideProps() {
	const data = await fetchDeck('1');
	return { props: { initialDeckData: data } };
}

export default Index;

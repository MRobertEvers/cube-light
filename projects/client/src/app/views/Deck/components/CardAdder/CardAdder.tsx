import { useState, useRef, useMemo } from 'preact/hooks';
import { mutate } from 'swr';
import { Spinner } from '../../../../components/Spinner/Spinner';
import { useDeckWorker } from '../../../../workers/deck.hook';
import EnterIcon from '../../../../components/Icons/EnterIcon';
import AlertIcon from '../../../../components/Icons/AlertIcon';

import styles from './card-adder.module.css';
import { createResponseHandler } from '../../../../workers/utils/messageToolkit';
import { DeckWorkerMessages } from '../../../../workers/deck.worker.messages';

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

export function CardAdder() {
	const [suggestions, setSuggestions] = useState({ sorted: [] as string[], set: new Set() });
	const [isWaiting, setIsWaiting] = useState(false);
	const [suggestDebounceTimer, setSuggestDebounceTimer] = useState(null as number | null);
	const [addItemText, setAddItemText] = useState('');
	const addItemInputRef = useRef<HTMLInputElement>(null);
	const itemCountRef = useRef<HTMLSelectElement>(null);

	const workerResponseHandler = useMemo(() => {
		return createResponseHandler((builder) => {
			builder.addCase(DeckWorkerMessages.getSuggestions, (response) => {
				setSuggestions(response.payload);
				setIsWaiting(false);
			});
			builder.addCase(DeckWorkerMessages.addCard, async (response) => {
				if (addItemInputRef.current) {
					addItemInputRef.current.focus();
				}
				setAddItemText('');
				setSuggestions({ sorted: [], set: new Set() });
				setIsWaiting(false);
				await mutate('1');
			});
			return builder;
		});
	}, []);

	const postToWorker = useDeckWorker(workerResponseHandler);

	let isOkToSubmit = false;
	let comboboxIndicator;
	if (isWaiting) {
		comboboxIndicator = <Spinner />;
	} else if (addItemText) {
		if (suggestions.set.size === 1 || suggestions.set.has(addItemText.toLowerCase())) {
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
				<div className={styles['combobox-input']}>
					<div className={styles['combobox-submit']}>{comboboxIndicator}</div>
					<input
						ref={addItemInputRef}
						onKeyDown={(e) => {
							if (e.which === KEY.TAB && suggestions.sorted.length === 1) {
								setAddItemText(suggestions.sorted[0]);
							}
						}}
						tabIndex={1}
						type="search"
						value={addItemText}
						placeholder="Card name"
						onChange={(e) => {
							const newText = e.target.value;
							setAddItemText(newText);
							if (suggestDebounceTimer) {
								clearTimeout(suggestDebounceTimer);
							}
							const timer: any = setTimeout(() => {
								if (newText.length > 3) {
									setIsWaiting(true);
									postToWorker(DeckWorkerMessages.getSuggestions(newText));
								} else {
									setSuggestions({ sorted: [], set: new Set() });
								}
							}, 500);
							setSuggestDebounceTimer(timer);
						}}
					/>
				</div>
				<select ref={itemCountRef} className={styles['combobox-count']}>
					<option>1</option>
					<option>2</option>
					<option>3</option>
					<option>4</option>
				</select>

				<button
					className={styles['submit-button']}
					disabled={!isOkToSubmit}
					onClick={() => {
						setIsWaiting(true);
						postToWorker(DeckWorkerMessages.addCard(addItemText));
					}}
				>
					{isWaiting ? <Spinner /> : 'Submit'}
				</button>
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
								if (itemCountRef.current) {
									itemCountRef.current.focus();
								}
							}
						}}
						onKeyDownCapture={(e) => {
							if (e.keyCode === KEY.BACKSPACE) {
								addItemInputRef.current.focus();
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
	);
}

import React, {
	MutableRefObject,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import { concatClassNames } from 'src/utils/concat-class-names';
import { createEvent, EventType } from 'src/utils/event-utils';

import styles from './combobox.module.css';

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

function createEvents<T>() {
	const events = {
		changed: createEvent<string>()('changed'),
		selected: createEvent<{ id: string; value: T; label: string }>()(
			'selected'
		),
		itemFocussed: createEvent<string>()('itemFocussed')
	};

	return events;
}

function stringOf<T>(
	s: string | { id: string; value: T; label: string }
): string {
	return typeof s === 'string' ? s : s.label;
}

export type ComboBoxEvent<T> = EventType<ReturnType<typeof createEvents<T>>>;

export interface ComboBoxProps<T> {
	suggestions?: Array<{ id: string; value: T; label: string }>;
	showSuggestions: boolean | 'auto';
	value: string;
	onEvent: (e: ComboBoxEvent<T>) => void;
}

export function ComboBox<T = string>(props: ComboBoxProps<T>) {
	const { onEvent, suggestions = [], value, showSuggestions } = props;

	const Events = useMemo(() => createEvents<T>(), []);

	const [focusRef, setFocusRef] = useState<HTMLDivElement | null>(null);
	const [autoOpen, setAutoOpen] = useState(false);
	const showDropDown =
		showSuggestions === true
			? suggestions.length !== 0
			: showSuggestions === 'auto' && autoOpen;

	useEffect(() => {
		if (showSuggestions === 'auto' && focusRef) {
			function onClick(e: MouseEvent) {
				if (focusRef?.contains(e?.target as Node))
					setAutoOpen(true);
				else setAutoOpen(false);
			}

			window.addEventListener('click', onClick);
			return function () {
				window.removeEventListener('click', onClick);
			};
		}
	}, [showSuggestions, focusRef]);

	return (
		<div
			className={styles['combobox']}
			ref={setFocusRef}
			onClick={() => {
				setAutoOpen(true);
			}}
		>
			<input
				value={value}
				type="search"
				onChange={(e) => onEvent(Events.changed(e.target.value))}
				onKeyDown={(e) => {
					if (e.which === KEY.TAB && suggestions.length) {
						onEvent(Events.selected(suggestions[0]));
					}
				}}
			/>
			<ul
				className={concatClassNames(
					styles['suggestions'],
					!showDropDown ? styles['hidden'] : ''
				)}
			>
				{suggestions.map((suggestion, index) => (
					<li
						tabIndex={index + 1}
						key={
							typeof suggestion === 'string'
								? suggestion
								: suggestion.id
						}
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							onEvent(Events.selected(suggestion));
							setAutoOpen(false);
						}}
						// onFocus={() => {
						// 	dispatch(Actions.setViewAddItemText(suggestion));
						// }}
						// onKeyDown={(e) => {
						// 	if (e.keyCode === KEY.ENTER) {
						// 		if (itemCountRef.current) {
						// 			itemCountRef.current.focus();
						// 		}
						// 	}
						// }}
						// onKeyDownCapture={(e) => {
						// 	if (e.keyCode === KEY.BACKSPACE) {
						// 		// addItemInputRef.current.focus();
						// 		dispatch(
						// 			Actions.setViewAddItemText(
						// 				viewAddItemText.substr(0, viewAddItemText.length - 1)
						// 			)
						// 		);
						// 		e.preventDefault();
						// 	}
						// }}
					>
						{stringOf(suggestion)}
					</li>
				))}
			</ul>
		</div>
	);
}

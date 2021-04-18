import React from 'react';
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

const Events = {
	changed: createEvent<string>()('changed'),
	selected: createEvent<string>()('selected'),
	itemFocussed: createEvent<string>()('itemFocussed')
};

export interface ComboBoxProps {
	suggestions: string[];
	showSuggestions: boolean;
	value: string;
	onEvent: (e: EventType<typeof Events>) => void;
}

export function ComboBox(props: ComboBoxProps) {
	const { onEvent, suggestions, value, showSuggestions } = props;

	const showDropDown = showSuggestions && suggestions.length !== 0;
	return (
		<div className={styles['combobox']}>
			<input
				value={value}
				type="search"
				onChange={(e) => onEvent(Events.changed(e.target.value))}
				onKeyDown={(e) => {
					if (e.which === KEY.TAB) {
						onEvent(Events.selected(suggestions.length > 0 ? suggestions[0] : ''));
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
						key={suggestion}
						onClick={() => onEvent(Events.selected(suggestion))}
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
						{suggestion}
					</li>
				))}
			</ul>
		</div>
	);
}

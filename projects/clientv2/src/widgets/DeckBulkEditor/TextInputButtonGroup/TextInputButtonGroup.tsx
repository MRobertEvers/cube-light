import React from 'react';
import { Button } from 'src/components/Button/Button';
import { ComboBox } from 'src/components/ComboBox/ComboBox';
import { createEvent, EventType } from 'src/utils/event-utils';

import styles from './text-input-button-group.module.css';

const Events = {
	changed: createEvent<string>()('changed'),
	selected: createEvent<string>()('selected'),
	itemFocussed: createEvent<string>()('itemFocussed'),
	clicked: createEvent()('clicked')
};

export interface TextInputButtonGroupProps {
	buttonText: string;
	value: string;

	showSuggestions?: boolean;
	suggestions?: string[];

	onEvent: (e: EventType<typeof Events>) => void;
}

export function TextInputButtonGroup(props: TextInputButtonGroupProps) {
	const { buttonText, value, onEvent, suggestions, showSuggestions } = props;

	return (
		<div className={styles['combobox']}>
			<ComboBox
				value={value}
				showSuggestions={showSuggestions || false}
				suggestions={suggestions || []}
				onEvent={onEvent}
			/>
			<Button onClick={() => onEvent(Events.clicked())}>{buttonText}</Button>
		</div>
	);
}

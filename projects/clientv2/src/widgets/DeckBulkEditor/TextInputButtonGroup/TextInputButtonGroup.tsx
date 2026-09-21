import React, { useCallback, useMemo } from 'react';
import { Button } from 'src/components/Button/Button';
import { ComboBox, ComboBoxEvent } from 'src/components/ComboBox/ComboBox';
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

	const listSuggestions = useMemo(() => {
		if (!suggestions) return [];
		return suggestions.map((s) => {
			return {
				id: s,
				value: s,
				label: s
			};
		});
	}, [suggestions]);

	const comboBoxOnEvent = useCallback(
		(e: ComboBoxEvent<string>) => {
			if (e.type === 'selected') {
				onEvent({
					type: 'selected',
					payload: e.payload.value
				});
			} else {
				onEvent(e);
			}
		},
		[onEvent]
	);

	return (
		<div className={styles['combobox']}>
			<ComboBox
				value={value}
				showSuggestions={showSuggestions || false}
				suggestions={listSuggestions}
				onEvent={comboBoxOnEvent}
			/>
			<Button onClick={() => onEvent(Events.clicked())}>{buttonText}</Button>
		</div>
	);
}

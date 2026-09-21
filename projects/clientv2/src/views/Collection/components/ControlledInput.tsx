import React, { useState } from 'react';
import { ComboBox } from 'src/components/ComboBox/ComboBox';

interface ControlledInputProps {
	onSubmit: (value: string) => void;
}

export function ControlledInput(props: ControlledInputProps) {
	const { onSubmit } = props;

	const [value, setValue] = useState('');

	return (
		<div>
			<ComboBox
				showSuggestions={false}
				value={value}
				onEvent={(e) => {
					if (e.type === 'selected') {
						setValue(e.payload.value);
					} else if (e.type === 'changed') {
						setValue(e.payload);
					}
				}}
			/>
			<button
				onClick={() => {
					onSubmit(value);
				}}
			>
				Create
			</button>
		</div>
	);
}

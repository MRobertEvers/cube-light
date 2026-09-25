import React from 'react';

import styles from './choice-list.module.css';

export type Choice = {
	id: string;
	label: string;
	detail?: string;
	/** A short label at the row's end, such as a role. */
	tag?: string;
};

type ChoiceListProps = {
	label: string;
	choices: Choice[];
	value: string | null;
	onChange: (id: string) => void;
	disabled?: boolean;
};

/** A list of options where one is chosen, drawn as full-width rows. */
export function ChoiceList(props: ChoiceListProps) {
	const { label, choices, value, onChange, disabled } = props;
	return (
		<div className={styles.list} role="radiogroup" aria-label={label}>
			{choices.map((choice) => (
				<button
					key={choice.id}
					type="button"
					role="radio"
					aria-checked={value === choice.id}
					className={styles.choice}
					disabled={disabled}
					onClick={() => onChange(choice.id)}
				>
					<span className={styles.text}>
						<span className={styles.label}>{choice.label}</span>
						{choice.detail && <span className={styles.detail}>{choice.detail}</span>}
					</span>
					{choice.tag && <span className={styles.tag}>{choice.tag}</span>}
				</button>
			))}
		</div>
	);
}

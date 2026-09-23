import React from 'react';
import { Button } from '../Button/Button';

import styles from './counter.module.css';

export function Counter(props: {
	count: number;
	setCount: (x: number) => void;
	min?: number;
	/** Names what is counted, for screen readers, when a form has several counters. */
	label?: string;
}) {
	const { count, setCount, min = 1, label = 'Number of copies' } = props;
	return (
		<div className={styles['counter']}>
			<Button
				className={styles['input-button']}
				ariaLabel={`Decrease ${label.toLowerCase()}`}
				disabled={count <= min}
				onClick={() => setCount(count - 1)}
			>
				-
			</Button>
			<input
				className={styles['input']}
				aria-label={label}
				type="number"
				min={min}
				step={1}
				value={count}
				onChange={(e) => {
					const newValue = parseInt(e.target.value);
					if (!isNaN(newValue)) {
						setCount(newValue);
					}
				}}
			/>
			<Button
				className={styles['input-button']}
				ariaLabel={`Increase ${label.toLowerCase()}`}
				onClick={() => setCount(count + 1)}
			>
				+
			</Button>
		</div>
	);
}

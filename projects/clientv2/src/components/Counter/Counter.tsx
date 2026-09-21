import React from 'react';
import { Button } from '../Button/Button';

import styles from './counter.module.css';

export function Counter(props: { count: number; setCount: (x: number) => void }) {
	const { count, setCount } = props;
	return (
		<div className={styles['counter']}>
			<Button
				className={styles['input-button']}
				ariaLabel="Decrease number of copies"
				disabled={count <= 1}
				onClick={() => setCount(count - 1)}
			>
				-
			</Button>
			<input
				className={styles['input']}
				aria-label="Number of copies"
				type="number"
				min={1}
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
				ariaLabel="Increase number of copies"
				onClick={() => setCount(count + 1)}
			>
				+
			</Button>
		</div>
	);
}

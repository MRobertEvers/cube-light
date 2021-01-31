import React from 'react';
import { Button } from '../Button/Button';

import styles from './counter.module.css';

export function Counter(props: { count: number; setCount: (x: number) => void }) {
	const { count, setCount } = props;
	return (
		<div>
			<Button
				className={styles['input-button']}
				style={{
					width: '28px',
					minWidth: '0px'
				}}
				onClick={() => setCount(count - 1)}
			>
				-
			</Button>
			<input
				className={styles['input']}
				type="number"
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
				style={{
					width: '28px',
					minWidth: '0px'
				}}
				onClick={() => setCount(count + 1)}
			>
				+
			</Button>
		</div>
	);
}

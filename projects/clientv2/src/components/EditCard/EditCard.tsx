import React from 'react';
import { useEffect, useState } from 'react';
import { FetchDeckCardResponse } from '../../api/fetch-api-deck';
import { Button } from '../Button/Button';

import styles from './edit-card.module.css';

function Counter(props: { count: number; setCount: (x: number) => void }) {
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

export type EditCardModalProps = {
	card: FetchDeckCardResponse | null;
	onSubmit: (card: FetchDeckCardResponse) => void;
	onCancel: () => void;
};
export function EditCardModal(props: EditCardModalProps) {
	const { card, onSubmit, onCancel } = props;
	const [count, setCount] = useState(0);

	useEffect(() => {
		if (card) {
			setCount(card.count);
		}
	}, [card]);

	if (!card) {
		return null;
	}

	return (
		<div className={styles['container']}>
			<div className={styles['contents']}>
				<h2 className={styles['header']}>{card.name}</h2>
				<div className={styles['body']}>
					<table className={styles['group-counter']}>
						<tbody>
							<tr>
								<td>
									<span>Main deck</span>
								</td>
								<td>
									<Counter count={count} setCount={setCount} />
								</td>
							</tr>
						</tbody>
					</table>
					<div className={styles['group-counter-buttons']}>
						<Button onClick={() => onSubmit({ ...card, count: count })}>Ok</Button>
						<Button onClick={() => onCancel()}>Cancel</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

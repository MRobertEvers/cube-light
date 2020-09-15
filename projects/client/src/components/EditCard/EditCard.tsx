import { useState } from 'react';
import { FetchDeckCardResponse } from '../../api/fetch-deck';
import { useEffect } from 'preact/hooks';

import styles from './edit-card.module.css';

function Counter(props: { count: number; onCountUp: () => void; onCountDown: () => void }) {
	const { count, onCountDown, onCountUp } = props;
	return (
		<div>
			<button onClick={() => onCountDown()}>-</button>
			<span>{count}</span>
			<button onClick={() => onCountUp()}>+</button>
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
					<Counter
						count={count}
						onCountDown={() => setCount((c) => (c > 0 ? c - 1 : c))}
						onCountUp={() => setCount((c) => c + 1)}
					/>
					<button onClick={() => onSubmit({ ...card, count: count })}>Ok</button>
					<button onClick={() => onCancel()}>Cancel</button>
				</div>
			</div>
		</div>
	);
}

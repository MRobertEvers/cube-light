import React from 'react';
import { useEffect, useState } from 'react';
import { Counter } from 'src/components/Counter/Counter';
import { FetchAPIDeckCardResponse } from '../../../../api/fetch-api-deck';
import { Button } from '../../../../components/Button/Button';

import styles from './edit-card.module.css';

export type EditCardModalProps = {
	card: FetchAPIDeckCardResponse | null;
	onSubmit: (card: FetchAPIDeckCardResponse) => void;
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
									<Counter
										count={count}
										setCount={(c) => (c >= 0 ? setCount(c) : {})}
									/>
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

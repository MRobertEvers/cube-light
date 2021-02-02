import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from 'src/components/Button/Button';

import styles from './new-deck.module.css';

export type NewDeckModalProps = {
	onSubmit: any;
};
export function NewDeckModal(props: NewDeckModalProps) {
	const { onSubmit } = props;
	const [name, setName] = useState('');

	return (
		<div className={styles['container']}>
			<div className={styles['contents']}>
				<input value={name} onChange={(e) => setName(e.target.value)} />
				<div className={styles['body']}>
					<div className={styles['group-counter-buttons']}>
						<Button onClick={() => onSubmit(name)}>Ok</Button>
						<Button>Cancel</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

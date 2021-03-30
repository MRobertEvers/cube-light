import React from 'react';
import { useEffect, useState } from 'react';
import { Button } from 'src/components/Button/Button';

import styles from './new-deck.module.css';

export enum NewDeckModalEventType {
	SUBMIT = 'NewDeckModalEventType/SUBMIT',
	CLOSE = 'NewDeckModalEventType/CLOSE'
}

export type NewDeckModalEvent =
	| {
			type: NewDeckModalEventType.CLOSE;
	  }
	| {
			type: NewDeckModalEventType.SUBMIT;
			payload: string;
	  };

export type NewDeckModalProps = {
	onEvent: (e: NewDeckModalEvent) => void;
};
export function NewDeckModal(props: NewDeckModalProps) {
	const { onEvent } = props;
	const [name, setName] = useState('');

	return (
		<div className={styles['container']}>
			<div className={styles['contents']}>
				<input value={name} onChange={(e) => setName(e.target.value)} />
				<div className={styles['body']}>
					<div className={styles['group-counter-buttons']}>
						<Button
							onClick={() =>
								onEvent({ type: NewDeckModalEventType.SUBMIT, payload: name })
							}
						>
							Ok
						</Button>
						<Button onClick={() => onEvent({ type: NewDeckModalEventType.CLOSE })}>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

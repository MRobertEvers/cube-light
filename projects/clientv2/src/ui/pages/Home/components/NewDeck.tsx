import React, { useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { useCloseOnEscape } from 'src/ui/kit/hooks/useCloseOnEscape';

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
	useCloseOnEscape(() => onEvent({ type: NewDeckModalEventType.CLOSE }));

	return (
		<div
			className={styles['container']}
			role="dialog"
			aria-modal="true"
			aria-labelledby="new-deck-title"
		>
			<div className={styles['contents']}>
				<h2 id="new-deck-title">Create a deck</h2>
				<label htmlFor="new-deck-name">Deck name</label>
				<input
					id="new-deck-name"
					autoFocus
					placeholder="Give your deck a name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<div className={styles['body']}>
					<div className={styles['group-counter-buttons']}>
						<Button
							disabled={!name.trim()}
							onClick={() =>
								onEvent({
									type: NewDeckModalEventType.SUBMIT,
									payload: name
								})
							}
						>
							Ok
						</Button>
						<Button
							onClick={() =>
								onEvent({
									type: NewDeckModalEventType.CLOSE
								})
							}
						>
							Cancel
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

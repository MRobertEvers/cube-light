import React, { useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';

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

	function close() {
		onEvent({ type: NewDeckModalEventType.CLOSE });
	}

	function submit() {
		if (!name.trim()) return;
		onEvent({ type: NewDeckModalEventType.SUBMIT, payload: name });
	}

	return (
		<SmallInputModal
			title="Create a deck"
			onClose={close}
			onSubmit={submit}
			actions={
				<>
					<Button onClick={close}>Cancel</Button>
					<Button
						type="submit"
						variant="primary"
						disabled={!name.trim()}
					>
						Create
					</Button>
				</>
			}
		>
			<div className={styles['field']}>
				<label htmlFor="new-deck-name">Deck name</label>
				<input
					id="new-deck-name"
					autoFocus
					enterKeyHint="done"
					placeholder="Give your deck a name"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
			</div>
		</SmallInputModal>
	);
}

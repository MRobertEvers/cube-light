import React from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';

import styles from './new-deck.module.css';

export type CreateDeckChoiceProps = {
	onNewDeck: () => void;
	onImageImport: () => void;
	onClose: () => void;
};

/** Asks whether to start an empty deck or build one from a photo of cards. */
export function CreateDeckChoice(props: CreateDeckChoiceProps) {
	const { onNewDeck, onImageImport, onClose } = props;

	return (
		<SmallInputModal
			title="Create a deck"
			onClose={onClose}
			actions={<Button onClick={onClose}>Cancel</Button>}
		>
			<div className={styles['choices']}>
				<button
					type="button"
					className={styles['choice']}
					autoFocus
					onClick={onNewDeck}
				>
					<strong>Add deck</strong>
					<span>Start an empty deck and add cards by name.</span>
				</button>
				<button
					type="button"
					className={styles['choice']}
					onClick={onImageImport}
				>
					<strong>Add from image</strong>
					<span>
						Photograph your cards and build the deck from them.
					</span>
				</button>
			</div>
		</SmallInputModal>
	);
}

import { useState } from 'react';
import { Button } from '../../components/Button/Button';
import { Spinner } from '../../components/Spinner/Spinner';

import styles from './deck.module.css';

export type DeleteDeckDialogProps = {
	deckName: string;
	onCancel: () => void;
	onDelete: () => Promise<void>;
};

/** Asks the user to type the deck's name before the deck is deleted. */
export function DeleteDeckDialog(props: DeleteDeckDialogProps) {
	const { deckName, onCancel, onDelete } = props;
	const [typedName, setTypedName] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const nameMatches = typedName.trim() === deckName.trim();

	async function confirmDelete() {
		if (!nameMatches || isDeleting) return;
		setError(null);
		setIsDeleting(true);
		try {
			await onDelete();
		} catch {
			setError('Unable to delete deck. Please try again.');
			setIsDeleting(false);
		}
	}

	return (
		<section
			className={styles['deck-details-modal']}
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-deck-title"
		>
			<h2 id="delete-deck-title">Delete deck</h2>
			<p className={styles['delete-deck-warning']}>
				This permanently deletes <strong>{deckName}</strong> and all of
				its cards. Type the deck's name to confirm.
			</p>
			<div className={styles['deck-details-fields']}>
				<label htmlFor="delete-deck-name">Deck name</label>
				<input
					autoFocus
					id="delete-deck-name"
					value={typedName}
					placeholder={deckName}
					disabled={isDeleting}
					autoComplete="off"
					spellCheck={false}
					onChange={(event) => setTypedName(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') void confirmDelete();
					}}
				/>
			</div>
			{error && (
				<p className={styles['save-error']} role="alert">
					{error}
				</p>
			)}
			<div className={styles['deck-details-actions']}>
				<Button onClick={onCancel} disabled={isDeleting}>
					Cancel
				</Button>
				<Button
					className={styles['delete-deck-button']}
					onClick={() => void confirmDelete()}
					disabled={!nameMatches || isDeleting}
				>
					{isDeleting ? (
						<span className={styles['saving-label']}>
							<Spinner /> Deleting…
						</span>
					) : (
						'Delete deck'
					)}
				</Button>
			</div>
		</section>
	);
}

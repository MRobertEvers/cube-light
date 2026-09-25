import React, { useEffect, useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { ChoiceList } from 'src/ui/kit/components/ChoiceList/ChoiceList';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { addMissingFromDeck, createCollection, loadLibrary } from 'src/redux/library/library.thunks';
import { selectWantedCollections } from 'src/redux/library/library.selectors';
import { errorMessage } from 'src/redux/thunk';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';

import styles from './add-missing-dialog.module.css';

/** The choice that makes a new wanted collection for the deck. */
const NEW_COLLECTION = 'new';

type AddMissingDialogProps = {
	deckId: string;
	deckName: string;
	missingCopies: number;
	onClose: () => void;
};

/** Adds the copies a deck lists but no owned collection holds to a wanted collection. */
export function AddMissingDialog(props: AddMissingDialogProps) {
	const { deckId, deckName, missingCopies, onClose } = props;
	const dispatch = useAppDispatch();
	const wanted = useAppSelector(selectWantedCollections);
	const [chosen, setChosen] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const target = chosen ?? wanted[0]?.collectionId ?? NEW_COLLECTION;

	useEffect(() => {
		void dispatch(loadLibrary());
	}, [dispatch]);

	async function add() {
		if (saving) return;
		setSaving(true);
		setError(null);
		try {
			const collectionId = target === NEW_COLLECTION ? await dispatch(createCollection(`${deckName} wishlist`, 'wanted')) : target;
			await dispatch(addMissingFromDeck(deckId, collectionId));
			onClose();
		} catch (addError) {
			setError(errorMessage(addError, 'Unable to add the missing cards. Please try again.'));
			setSaving(false);
		}
	}

	const choices = wanted
		.map((collection) => ({
			id: collection.collectionId,
			label: collection.name,
			detail: `${collection.copies} ${collection.copies === 1 ? 'copy' : 'copies'} · ${collection.names} ${collection.names === 1 ? 'name' : 'names'}`,
			tag: 'Wanted'
		}))
		.concat([{ id: NEW_COLLECTION, label: 'New wanted collection', detail: `Named “${deckName} wishlist”`, tag: '' }]);

	return (
		<SmallInputModal
			title={`Add ${missingCopies} missing ${missingCopies === 1 ? 'card' : 'cards'} to…`}
			onClose={onClose}
			closeDisabled={saving}
			onSubmit={() => void add()}
			busy={saving}
			actions={
				<>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={saving || missingCopies === 0}>
						{saving ? (
							<>
								<Spinner /> Adding…
							</>
						) : (
							'Add'
						)}
					</Button>
				</>
			}
		>
			<p className={styles.intro}>
				Each card the deck lists beyond what your collections hold is added, in the printing the deck uses.
			</p>
			<ChoiceList label="Wanted collection" choices={choices} value={target} onChange={setChosen} disabled={saving} />
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}

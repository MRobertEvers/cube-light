import React, { useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { ChoiceList } from 'src/ui/kit/components/ChoiceList/ChoiceList';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import type { CollectionCardCount, CollectionSummaries } from 'src/domain/models/library';
import { moveCollectionCards } from 'src/redux/library/library.thunks';
import { useAppDispatch } from 'src/redux/use-app-dispatch';

import styles from './collection-dialogs.module.css';

type MoveToCollectionDialogProps = {
	fromCollectionId: string;
	cardName: string;
	/** Every copy of the card's printings in this collection. */
	cards: CollectionCardCount[];
	collections: CollectionSummaries;
	onClose: () => void;
};

/** Moves every copy of a card to another collection. Their storage locations stay behind. */
export function MoveToCollectionDialog(props: MoveToCollectionDialogProps) {
	const { fromCollectionId, cardName, cards, collections, onClose } = props;
	const dispatch = useAppDispatch();
	const others = collections.filter((collection) => collection.collectionId !== fromCollectionId);
	const [target, setTarget] = useState<string | null>(others[0]?.collectionId ?? null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const copies = cards.reduce((total, card) => total + card.count, 0);

	async function move() {
		if (!target || saving) return;
		setSaving(true);
		setError(null);
		try {
			await dispatch(moveCollectionCards(fromCollectionId, target, cards));
			onClose();
		} catch {
			setError('Unable to move the cards. Please try again.');
			setSaving(false);
		}
	}

	return (
		<SmallInputModal
			title={`Move ${copies} ${cardName}`}
			onClose={onClose}
			closeDisabled={saving}
			onSubmit={() => void move()}
			busy={saving}
			actions={
				<>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={!target || saving}>
						{saving ? (
							<>
								<Spinner /> Moving…
							</>
						) : (
							'Move'
						)}
					</Button>
				</>
			}
		>
			{others.length ? (
				<ChoiceList
					label="Collection"
					choices={others.map((collection) => ({ id: collection.collectionId, label: collection.name, detail: `${collection.copies} copies`, tag: collection.role === 'wanted' ? 'Wanted' : undefined }))}
					value={target}
					onChange={setTarget}
					disabled={saving}
				/>
			) : (
				<p className={styles.hint}>There is no other collection yet. Make one in the Library first.</p>
			)}
			<p className={styles.hint}>The copies arrive unplaced; file them in a storage location from their new collection.</p>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}

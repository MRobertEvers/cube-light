import React, { useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import type { CollectionRole } from 'src/domain/models/library';

import styles from './library-dialogs.module.css';

export type CollectionDraft = { name: string; role: CollectionRole };

type CollectionDialogProps = {
	/** The collection being edited; null to make one. */
	collection: CollectionDraft | null;
	onSave: (draft: CollectionDraft) => Promise<void>;
	onClose: () => void;
};

/** Names a collection and says whether its cards are owned or wanted. */
export function CollectionDialog(props: CollectionDialogProps) {
	const { collection, onSave, onClose } = props;
	const [name, setName] = useState(collection?.name ?? '');
	const [role, setRole] = useState<CollectionRole>(collection?.role ?? 'owned');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canSave = !!name.trim() && !saving;

	async function save() {
		if (!canSave) return;
		setSaving(true);
		setError(null);
		try {
			await onSave({ name: name.trim(), role });
		} catch {
			setError('Unable to save the collection. Please try again.');
			setSaving(false);
		}
	}

	return (
		<SmallInputModal
			title={collection ? 'Edit collection' : 'New collection'}
			onClose={onClose}
			closeDisabled={saving}
			onSubmit={() => void save()}
			busy={saving}
			actions={
				<>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={!canSave}>
						{saving ? (
							<>
								<Spinner /> Saving…
							</>
						) : collection ? (
							'Save'
						) : (
							'Create'
						)}
					</Button>
				</>
			}
		>
			<div className={styles.field}>
				<label htmlFor="collection-name">Name</label>
				<input
					id="collection-name"
					autoFocus
					value={name}
					maxLength={1024}
					disabled={saving}
					placeholder="e.g. Binder"
					onChange={(event) => setName(event.target.value)}
				/>
			</div>
			<fieldset className={styles.field}>
				<legend>These cards are</legend>
				<div className={styles.segmented} role="group" aria-label="These cards are">
					<button type="button" aria-pressed={role === 'owned'} disabled={saving} onClick={() => setRole('owned')}>
						Owned
					</button>
					<button type="button" aria-pressed={role === 'wanted'} disabled={saving} onClick={() => setRole('wanted')}>
						Wanted
					</button>
				</div>
				<p className={styles.hint}>
					{role === 'owned'
						? 'Owned collections count toward the cards you have when building decks.'
						: 'Wanted collections list cards you are after, like a wishlist.'}
				</p>
			</fieldset>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}

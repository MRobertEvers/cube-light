import React, { useState } from 'react';
import { Button } from 'src/ui/kit/components/Button/Button';
import { SmallInputModal } from 'src/ui/kit/components/SmallInputModal/SmallInputModal';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import { MAX_LOCATION_DESCRIPTION_LENGTH } from 'src/domain/models/library';

import styles from './library-dialogs.module.css';

export type LocationDraft = { name: string; description: string };

type LocationDialogProps = {
	/** The location being edited; null to make one. */
	location: LocationDraft | null;
	onSave: (draft: LocationDraft) => Promise<void>;
	onClose: () => void;
};

/** Names a storage location and says where to find it. */
export function LocationDialog(props: LocationDialogProps) {
	const { location, onSave, onClose } = props;
	const [name, setName] = useState(location?.name ?? '');
	const [description, setDescription] = useState(location?.description ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canSave = !!name.trim() && !saving;

	async function save() {
		if (!canSave) return;
		setSaving(true);
		setError(null);
		try {
			await onSave({ name: name.trim(), description: description.trim() });
		} catch {
			setError('Unable to save the storage location. Please try again.');
			setSaving(false);
		}
	}

	return (
		<SmallInputModal
			title={location ? 'Edit storage location' : 'New storage location'}
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
						) : location ? (
							'Save'
						) : (
							'Create'
						)}
					</Button>
				</>
			}
		>
			<div className={styles.field}>
				<label htmlFor="location-name">Name</label>
				<input
					id="location-name"
					autoFocus
					value={name}
					maxLength={1024}
					disabled={saving}
					placeholder="e.g. Long box A"
					onChange={(event) => setName(event.target.value)}
				/>
			</div>
			<div className={styles.field}>
				<label htmlFor="location-description">Where to find it</label>
				<input
					id="location-description"
					value={description}
					maxLength={MAX_LOCATION_DESCRIPTION_LENGTH}
					disabled={saving}
					placeholder="e.g. Closet, top shelf"
					onChange={(event) => setDescription(event.target.value)}
				/>
			</div>
			{error && (
				<p className={styles.error} role="alert">
					{error}
				</p>
			)}
		</SmallInputModal>
	);
}

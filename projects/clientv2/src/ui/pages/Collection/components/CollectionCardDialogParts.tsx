import React from 'react';
import { HeaderBackButton } from 'src/ui/kit/components/BackLink/BackLink';
import { HeaderBackSlot } from 'src/ui/kit/components/Header/HeaderBackSlot';
import { Counter } from 'src/ui/kit/components/Counter/Counter';
import { Spinner } from 'src/ui/kit/components/Spinner/Spinner';
import type { StorageLocationSummaries } from 'src/domain/models/library';
import type { CollectionCardDraftState } from './use-collection-card-draft';
import { placedTotal } from './use-collection-card-draft';

import styles from './collection-card-dialog.module.css';

/** The dialog's sticky top bar: back (into the app bar on phones), the card, Cancel and Save. */
export function CollectionCardTopBar(props: { cardName: string; editor: CollectionCardDraftState; onClose: () => void }) {
	const { cardName, editor, onClose } = props;
	const { saving, save } = editor;
	return (
		<header className={styles.topBar}>
			<HeaderBackSlot>
				<HeaderBackButton inline label={`Close ${cardName}`} onClick={() => !saving && onClose()} />
			</HeaderBackSlot>
			<h2 id="collection-card-title">{cardName}</h2>
			<div className={styles.actions}>
				<button type="button" className={styles.secondary} disabled={saving} onClick={onClose}>
					Cancel
				</button>
				<button type="button" className={styles.primary} disabled={saving} onClick={() => void save()}>
					{saving ? (
						<>
							<Spinner /> Saving…
						</>
					) : (
						'Save'
					)}
				</button>
			</div>
		</header>
	);
}

/** How many copies of one printing, spoken the way the dialog shows it. */
export function copiesText(count: number): string {
	return count === 0 ? 'Removed on save' : `${count} ${count === 1 ? 'copy' : 'copies'}`;
}

/** The copies stepper for one printing. */
export function PrintingCounter(props: { uuid: string; label: string; editor: CollectionCardDraftState }) {
	const { uuid, label, editor } = props;
	return <Counter count={editor.draft[uuid].count} min={0} label={`${label} copies`} setCount={(count) => editor.setCount(uuid, count)} />;
}

/** Which storage location keeps each copy of one printing; the rest stay unplaced. */
export function PrintingPlaces(props: { uuid: string; label: string; locations: StorageLocationSummaries; editor: CollectionCardDraftState }) {
	const { uuid, label, locations, editor } = props;
	const entry = editor.draft[uuid];
	if (locations.length === 0 || entry.count === 0) return null;
	return (
		<div className={styles.place}>
			<h3>Place</h3>
			{locations.map((location) => (
				<div key={location.locationId} className={styles.placeRow}>
					<span>{location.name}</span>
					<Counter
						count={entry.placed[location.locationId]}
						min={0}
						label={`${label} copies in ${location.name}`}
						setCount={(count) => editor.setPlaced(uuid, location.locationId, count)}
					/>
				</div>
			))}
			<div className={`${styles.placeRow} ${styles.remainder}`}>
				<span>Unplaced</span>
				<span>{entry.count - placedTotal(entry.placed)}</span>
			</div>
		</div>
	);
}

/** The save error, when there is one. */
export function CollectionCardError(props: { editor: CollectionCardDraftState }) {
	const { editor } = props;
	if (!editor.error) return null;
	return (
		<p className={styles.error} role="alert">
			{editor.error}
		</p>
	);
}

/** Shown when there is nowhere to place copies yet. */
export function NoLocationsHint(props: { locations: StorageLocationSummaries }) {
	const { locations } = props;
	if (locations.length > 0) return null;
	return <p className={styles.hint}>Add storage locations in the Library to record where these copies are kept.</p>;
}

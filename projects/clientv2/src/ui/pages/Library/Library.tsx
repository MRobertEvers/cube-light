import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OverflowMenu } from 'src/ui/kit/components/OverflowMenu/OverflowMenu';
import { ManaCost } from 'src/ui/kit/components/ManaCost/ManaCost';
import { ConfirmDialog } from 'src/ui/kit/components/ConfirmDialog/ConfirmDialog';
import { SpotlightCard } from 'src/ui/features/SpotlightCard/SpotlightCard';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';
import type { CollectionSummary, StorageLocationSummary } from 'src/domain/models/library';
import {
	createCollection,
	createStorageLocation,
	deleteCollection,
	deleteStorageLocation,
	describeStorageLocation,
	loadLibrary,
	renameCollection,
	setCollectionRole
} from 'src/redux/library/library.thunks';
import { selectCollections, selectLibraryError, selectStorageLocations } from 'src/redux/library/library.selectors';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import { Page } from '../../kit/components/Page/Page';
import { CollectionDialog, type CollectionDraft } from './components/CollectionDialog';
import { LocationDialog, type LocationDraft } from './components/LocationDialog';

import styles from './library.module.css';

type LibraryModal =
	/** Edits a collection, or makes one when `collectionId` is null. */
	| { type: 'collection'; collectionId: string | null }
	| { type: 'location'; locationId: string | null }
	| { type: 'delete-collection'; collectionId: string }
	| { type: 'delete-location'; locationId: string };

function plural(count: number, one: string, many: string): string {
	return `${count.toLocaleString()} ${count === 1 ? one : many}`;
}

function CollectionTile(props: { collection: CollectionSummary; onEdit: () => void; onDelete: () => void }) {
	const { collection, onEdit, onDelete } = props;
	return (
		<div className={styles.tile}>
			<Link className={styles.tileLink} to={`/collection/${collection.collectionId}`}>
				<SpotlightCard
					name={collection.name}
					art={collection.art}
					tile
					updatedAt={collection.updatedAt}
					footer={
						collection.colors.length > 0 && (
							<span className={styles.tileFooter}>
								<ManaCost cost={collection.colors.map((color) => `{${color}}`).join('')} label={`Colors: ${collection.colors.join('')}`} />
							</span>
						)
					}
				/>
			</Link>
			<div className={styles.tileBar}>
				<span className={styles.tileMeta}>
					<span className={collection.role === 'owned' ? styles.owned : styles.wanted}>
						{collection.role === 'owned' ? 'Owned' : 'Wanted'}
					</span>
					<span className={styles.tileCounts}>
						{plural(collection.copies, 'copy', 'copies')} · {plural(collection.names, 'name', 'names')}
						{collection.role === 'owned' && collection.unplaced > 0 && collection.unplaced < collection.copies && ` · ${collection.unplaced.toLocaleString()} unplaced`}
					</span>
				</span>
				<OverflowMenu label={`Actions for ${collection.name}`}>
					<button type="button" onClick={onEdit}>
						Rename or change role
					</button>
					<button type="button" className={styles.danger} onClick={onDelete}>
						Delete
					</button>
				</OverflowMenu>
			</div>
		</div>
	);
}

function LocationRow(props: { location: StorageLocationSummary; onEdit: () => void; onDelete: () => void }) {
	const { location, onEdit, onDelete } = props;
	const details = [plural(location.copies, 'copy', 'copies')];
	if (location.collections.length) details.push(location.collections.map((collection) => collection.name).join(', '));
	return (
		<li className={styles.locationRow}>
			<Link className={styles.locationLink} to={`/location/${location.locationId}`}>
				<span className={styles.locationName}>{location.name}</span>
				<span className={styles.locationDetail}>
					{location.description && <>{location.description} · </>}
					{details.join(' · ')}
				</span>
			</Link>
			<OverflowMenu label={`Actions for ${location.name}`}>
				<button type="button" onClick={onEdit}>
					Edit
				</button>
				<button type="button" className={styles.danger} onClick={onDelete}>
					Delete
				</button>
			</OverflowMenu>
		</li>
	);
}

/** Every collection and storage location: what cards you have or want, and where they are kept. */
export function Library() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const modalHistory = useHistoryModal<LibraryModal>('library');
	const modal = modalHistory.value;
	const collections = useAppSelector(selectCollections);
	const locations = useAppSelector(selectStorageLocations);
	const error = useAppSelector(selectLibraryError);

	useEffect(() => {
		void dispatch(loadLibrary());
	}, [dispatch]);

	const owned = (collections ?? []).filter((collection) => collection.role === 'owned');
	const wanted = (collections ?? []).filter((collection) => collection.role === 'wanted');
	const editingCollection = modal?.type === 'collection' && modal.collectionId ? (collections ?? []).find((collection) => collection.collectionId === modal.collectionId) : undefined;
	const editingLocation = modal?.type === 'location' && modal.locationId ? (locations ?? []).find((location) => location.locationId === modal.locationId) : undefined;
	const deletingCollection = modal?.type === 'delete-collection' ? (collections ?? []).find((collection) => collection.collectionId === modal.collectionId) : undefined;
	const deletingLocation = modal?.type === 'delete-location' ? (locations ?? []).find((location) => location.locationId === modal.locationId) : undefined;

	async function saveCollection(draft: CollectionDraft) {
		if (editingCollection) {
			if (draft.name !== editingCollection.name) await dispatch(renameCollection(editingCollection.collectionId, draft.name));
			if (draft.role !== editingCollection.role) await dispatch(setCollectionRole(editingCollection.collectionId, draft.role));
			modalHistory.close();
			return;
		}
		const collectionId = await dispatch(createCollection(draft.name, draft.role));
		navigate(`/collection/${collectionId}`, { replace: true });
	}

	async function saveLocation(draft: LocationDraft) {
		if (editingLocation) await dispatch(describeStorageLocation(editingLocation.locationId, draft.name, draft.description));
		else await dispatch(createStorageLocation(draft.name, draft.description));
		modalHistory.close();
	}

	const newItems = (
		<>
			<button type="button" onClick={() => modalHistory.open({ type: 'collection', collectionId: null })}>
				New collection
			</button>
			<button type="button" onClick={() => modalHistory.open({ type: 'location', locationId: null })}>
				New storage location
			</button>
		</>
	);

	function tiles(list: CollectionSummary[]) {
		return (
			<div className={styles.grid}>
				{list.map((collection) => (
					<CollectionTile
						key={collection.collectionId}
						collection={collection}
						onEdit={() => modalHistory.open({ type: 'collection', collectionId: collection.collectionId })}
						onDelete={() => modalHistory.open({ type: 'delete-collection', collectionId: collection.collectionId })}
					/>
				))}
			</div>
		);
	}

	return (
		<Page chrome={{ desktop: <OverflowMenu label="Add to the library" triggerClassName={styles.newTrigger} icon={<span className={styles.plus} aria-hidden="true">+</span>}>{newItems}</OverflowMenu>, mobile: newItems }}>
			{modal?.type === 'collection' && (modal.collectionId === null || editingCollection) && (
				<CollectionDialog
					key={modal.collectionId ?? 'new'}
					collection={editingCollection ? { name: editingCollection.name, role: editingCollection.role } : null}
					onSave={saveCollection}
					onClose={modalHistory.close}
				/>
			)}
			{modal?.type === 'location' && (modal.locationId === null || editingLocation) && (
				<LocationDialog
					key={modal.locationId ?? 'new'}
					location={editingLocation ? { name: editingLocation.name, description: editingLocation.description ?? '' } : null}
					onSave={saveLocation}
					onClose={modalHistory.close}
				/>
			)}
			{deletingCollection && (
				<ConfirmDialog
					title={`Delete “${deletingCollection.name}”?`}
					confirmLabel="Delete collection"
					busyLabel="Deleting…"
					danger
					failure="Unable to delete the collection. Please try again."
					onCancel={modalHistory.close}
					onConfirm={async () => {
						await dispatch(deleteCollection(deletingCollection.collectionId));
						modalHistory.close();
					}}
				>
					<p>
						Its {plural(deletingCollection.copies, 'copy', 'copies')} leave the library, and decks stop counting them as{' '}
						{deletingCollection.role}.
					</p>
				</ConfirmDialog>
			)}
			{deletingLocation && (
				<ConfirmDialog
					title={`Delete “${deletingLocation.name}”?`}
					confirmLabel="Delete location"
					busyLabel="Deleting…"
					danger
					failure="Unable to delete the storage location. Please try again."
					onCancel={modalHistory.close}
					onConfirm={async () => {
						await dispatch(deleteStorageLocation(deletingLocation.locationId));
						modalHistory.close();
					}}
				>
					{deletingLocation.copies > 0 ? (
						<p>
							<strong>{plural(deletingLocation.copies, 'copy is', 'copies are')} filed here.</strong> They stay in{' '}
							{deletingLocation.collections.map((collection) => collection.name).join(', ')} and become unplaced. Nothing is removed from a collection.
						</p>
					) : (
						<p>Nothing is filed here.</p>
					)}
				</ConfirmDialog>
			)}
			<main className={styles.container}>
				<div className={styles.heading}>
					<div>
						<h1>Library</h1>
						<p>The cards you own or want, and where you keep them.</p>
					</div>
				</div>
				{error && <p role="alert">Unable to read the library.</p>}
				<section className={styles.section} aria-labelledby="library-owned">
					<header className={styles.sectionHeading}>
						<h2 id="library-owned">Collections</h2>
						<button type="button" className={styles.sectionAction} onClick={() => modalHistory.open({ type: 'collection', collectionId: null })}>
							New collection
						</button>
					</header>
					{collections === null ? (
						<p className={styles.empty}>Reading your library…</p>
					) : owned.length ? (
						tiles(owned)
					) : (
						<p className={styles.empty}>No collections yet. Make one for each binder or box of cards you own; decks then show which cards you have.</p>
					)}
				</section>
				{wanted.length > 0 && (
					<section className={styles.section} aria-labelledby="library-wanted">
						<header className={styles.sectionHeading}>
							<h2 id="library-wanted">Wanted</h2>
						</header>
						{tiles(wanted)}
					</section>
				)}
				<section className={styles.section} aria-labelledby="library-locations">
					<header className={styles.sectionHeading}>
						<h2 id="library-locations">Storage locations</h2>
						<button type="button" className={styles.sectionAction} onClick={() => modalHistory.open({ type: 'location', locationId: null })}>
							New location
						</button>
					</header>
					{locations && locations.length > 0 ? (
						<ul className={styles.locations}>
							{locations.map((location) => (
								<LocationRow
									key={location.locationId}
									location={location}
									onEdit={() => modalHistory.open({ type: 'location', locationId: location.locationId })}
									onDelete={() => modalHistory.open({ type: 'delete-location', locationId: location.locationId })}
								/>
							))}
						</ul>
					) : (
						locations && <p className={styles.empty}>No storage locations yet. Add the boxes, binders and shelves you keep cards in, then place copies in them.</p>
					)}
				</section>
			</main>
		</Page>
	);
}

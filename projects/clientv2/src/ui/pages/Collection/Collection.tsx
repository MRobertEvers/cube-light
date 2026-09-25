import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from 'src/ui/kit/components/BackLink/BackLink';
import { ConfirmDialog } from 'src/ui/kit/components/ConfirmDialog/ConfirmDialog';
import { LoadingIndicator } from 'src/ui/kit/components/LoadingIndicator';
import { OverflowMenu } from 'src/ui/kit/components/OverflowMenu/OverflowMenu';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';
import { CollectionBoardReduxWidget } from 'src/ui/features/library/CollectionBoardReduxWidget';
import type { DeckCardEntry } from 'src/domain/models/deck';
import type { DeckCardGroup } from 'src/domain/deck/group-deck-cards';
import { ALL_PLACEMENTS, placementTotals, type PlacementFilter } from 'src/domain/library/placements';
import type { StorageLocationSummaries } from 'src/domain/models/library';
import {
	deleteCollection,
	loadCollection,
	loadLibrary,
	renameCollection,
	setCollectionRole
} from 'src/redux/library/library.thunks';
import {
	selectCollection,
	selectCollectionError,
	selectCollections,
	selectStorageLocations
} from 'src/redux/library/library.selectors';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import { Page } from '../../kit/components/Page/Page';
import { CardPreviewerReduxWidget } from '../../features/CardPreviewer/CardPreviewerReduxWidget';
import { Modal } from '../Deck/components/Modal';
import { CollectionDialog, type CollectionDraft } from '../Library/components/CollectionDialog';
import { AddToCollectionDialog } from './components/AddToCollectionDialog';
import { CollectionCardDialogReduxWidget } from './components/CollectionCardDialogReduxWidget';
import { MoveToCollectionDialog } from './components/MoveToCollectionDialog';
import { PasteToCollectionDialog } from './components/PasteToCollectionDialog';

import styles from './collection.module.css';

const NO_LOCATIONS: StorageLocationSummaries = [];

type CollectionModal =
	| { type: 'add-card' }
	| { type: 'paste' }
	| { type: 'edit-card'; name: string }
	| { type: 'move-card'; name: string }
	| { type: 'preview'; card: DeckCardEntry }
	| { type: 'details' }
	| { type: 'delete' };

function sameFilter(a: PlacementFilter, b: PlacementFilter): boolean {
	return a.type === b.type && (a.type !== 'location' || (b.type === 'location' && a.locationId === b.locationId));
}

/** One collection: its cards, where each copy is kept, and ways to add, edit and file them. */
export function Collection(props: { collectionId: string }) {
	const { collectionId } = props;
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const modalHistory = useHistoryModal<CollectionModal>(`collection:${collectionId}`);
	const modal = modalHistory.value;
	const collection = useAppSelector((root) => selectCollection(root, collectionId));
	const error = useAppSelector((root) => selectCollectionError(root, collectionId));
	const collections = useAppSelector(selectCollections);
	const locations = useAppSelector(selectStorageLocations) ?? NO_LOCATIONS;
	const [filter, setFilter] = useState<PlacementFilter>(ALL_PLACEMENTS);

	useEffect(() => {
		void dispatch(loadCollection(collectionId));
		void dispatch(loadLibrary());
	}, [collectionId, dispatch]);

	const totals = useMemo(() => (collection ? placementTotals(collection) : null), [collection]);
	const openCard = useCallback((card: DeckCardEntry) => modalHistory.open({ type: 'preview', card }), [modalHistory.open]);
	const editCard = useCallback((group: DeckCardGroup) => modalHistory.open({ type: 'edit-card', name: group.name }), [modalHistory.open]);
	const moveCard = useCallback((group: DeckCardGroup) => modalHistory.open({ type: 'move-card', name: group.name }), [modalHistory.open]);

	if (!collection) {
		return <Page>{error ? <p className={styles.message}>{error}</p> : <LoadingIndicator />}</Page>;
	}

	const held = collection.cards;
	function printingsOf(name: string) {
		return held.filter((card) => card.name === name);
	}
	const addItems = (
		<>
			<button type="button" onClick={() => modalHistory.open({ type: 'add-card' })}>
				Add a card
			</button>
			<button type="button" onClick={() => modalHistory.open({ type: 'paste' })}>
				Paste a list
			</button>
		</>
	);
	const collectionItems = (
		<>
			<button type="button" onClick={() => modalHistory.open({ type: 'details' })}>
				Rename or change role
			</button>
			<button type="button" className={styles.danger} onClick={() => modalHistory.open({ type: 'delete' })}>
				Delete collection
			</button>
		</>
	);

	async function saveDetails(draft: CollectionDraft) {
		if (!collection) return;
		if (draft.name !== collection.name) await dispatch(renameCollection(collectionId, draft.name));
		if (draft.role !== collection.role) await dispatch(setCollectionRole(collectionId, draft.role));
		modalHistory.close();
	}

	const chips: Array<{ key: string; label: string; count: number; filter: PlacementFilter }> = [{ key: 'all', label: 'All', count: collection.copies, filter: ALL_PLACEMENTS }];
	if (totals && locations.length) {
		chips.push({ key: 'unplaced', label: 'Unplaced', count: totals.unplaced, filter: { type: 'unplaced' } });
		for (const location of locations)
			if (totals.byLocation[location.locationId]) chips.push({ key: location.locationId, label: location.name, count: totals.byLocation[location.locationId], filter: { type: 'location', locationId: location.locationId } });
	}

	return (
		<Page chrome={{ mobile: (
			<>
				{addItems}
				{collectionItems}
			</>
		) }}>
			{modal?.type === 'add-card' && (
				<AddToCollectionDialog
					collectionId={collectionId}
					collectionName={collection.name}
					locations={locations}
					initialLocationId={filter.type === 'location' ? filter.locationId : null}
					onClose={modalHistory.close}
				/>
			)}
			{modal?.type === 'paste' && <PasteToCollectionDialog collectionId={collectionId} collectionName={collection.name} onClose={modalHistory.close} />}
			{modal?.type === 'edit-card' && printingsOf(modal.name).length > 0 && (
				<Modal fullScreenOnMobile>
					<CollectionCardDialogReduxWidget
						key={modal.name}
						collectionId={collectionId}
						cardName={modal.name}
						printings={printingsOf(modal.name)}
						stored={collection.stored}
						locations={locations}
						onClose={modalHistory.close}
					/>
				</Modal>
			)}
			{modal?.type === 'move-card' && printingsOf(modal.name).length > 0 && (
				<MoveToCollectionDialog
					fromCollectionId={collectionId}
					cardName={modal.name}
					cards={printingsOf(modal.name).map((card) => ({ uuid: card.uuid, count: card.count }))}
					collections={collections ?? []}
					onClose={modalHistory.close}
				/>
			)}
			{modal?.type === 'preview' && (
				<Modal key={modal.card.uuid} extraWide fullScreenOnMobile>
					<CardPreviewerReduxWidget card={modal.card} onClose={modalHistory.close} />
				</Modal>
			)}
			{modal?.type === 'details' && (
				<CollectionDialog collection={{ name: collection.name, role: collection.role }} onSave={saveDetails} onClose={modalHistory.close} />
			)}
			{modal?.type === 'delete' && (
				<ConfirmDialog
					title={`Delete “${collection.name}”?`}
					confirmLabel="Delete collection"
					busyLabel="Deleting…"
					danger
					failure="Unable to delete the collection. Please try again."
					onCancel={modalHistory.close}
					onConfirm={async () => {
						await dispatch(deleteCollection(collectionId));
						navigate('/library', { replace: true });
					}}
				>
					<p>
						Its {collection.copies.toLocaleString()} {collection.copies === 1 ? 'copy leaves' : 'copies leave'} the library, and decks stop
						counting them as {collection.role}.
					</p>
				</ConfirmDialog>
			)}
			<main className={styles.container}>
				<header className={styles.header}>
					<div className={styles.headerTop}>
						<BackLink to="/library">Library</BackLink>
					</div>
					<div className={styles.identity}>
						<h1>{collection.name}</h1>
						<span className={collection.role === 'owned' ? styles.owned : styles.wanted}>{collection.role === 'owned' ? 'Owned' : 'Wanted'}</span>
						<span className={styles.stats}>
							{collection.copies.toLocaleString()} {collection.copies === 1 ? 'copy' : 'copies'} · {collection.cards.length.toLocaleString()} printings
							{locations.length > 0 && collection.unplaced > 0 && (
								<>
									{' · '}
									<strong className={styles.unplaced}>{collection.unplaced.toLocaleString()} unplaced</strong>
								</>
							)}
						</span>
						<div className={styles.actions}>
							<button type="button" className={styles.secondary} onClick={() => modalHistory.open({ type: 'paste' })}>
								Paste a list
							</button>
							<button type="button" className={styles.primary} onClick={() => modalHistory.open({ type: 'add-card' })}>
								Add a card
							</button>
							<OverflowMenu label={`Actions for ${collection.name}`}>{collectionItems}</OverflowMenu>
						</div>
					</div>
					{chips.length > 1 && (
						<div className={styles.chips} role="group" aria-label="Show copies">
							{chips.map((chip) => (
								<button key={chip.key} type="button" aria-pressed={sameFilter(chip.filter, filter)} onClick={() => setFilter(chip.filter)}>
									{chip.label} <span>{chip.count.toLocaleString()}</span>
								</button>
							))}
						</div>
					)}
				</header>
				<CollectionBoardReduxWidget collectionId={collectionId} filter={filter} onViewCard={openCard} onEditCard={editCard} onMoveCard={moveCard} />
			</main>
		</Page>
	);
}

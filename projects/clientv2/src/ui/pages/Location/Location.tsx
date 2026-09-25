import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from 'src/ui/kit/components/BackLink/BackLink';
import { ConfirmDialog } from 'src/ui/kit/components/ConfirmDialog/ConfirmDialog';
import { LoadingIndicator } from 'src/ui/kit/components/LoadingIndicator';
import { OverflowMenu } from 'src/ui/kit/components/OverflowMenu/OverflowMenu';
import { useHistoryModal } from 'src/ui/kit/hooks/useHistoryModal';
import { LocationBoardReduxWidget } from 'src/ui/features/library/LocationBoardReduxWidget';
import type { DeckCardEntry } from 'src/domain/models/deck';
import { deleteStorageLocation, describeStorageLocation, loadLibrary, loadLocation } from 'src/redux/library/library.thunks';
import { selectLocation, selectLocationError } from 'src/redux/library/library.selectors';
import { useAppDispatch } from 'src/redux/use-app-dispatch';
import { useAppSelector } from 'src/redux/use-app-selector';
import { Page } from '../../kit/components/Page/Page';
import { CardPreviewModal } from '../Deck/components/EditCard';
import { Modal } from '../Deck/components/Modal';
import { LocationDialog, type LocationDraft } from '../Library/components/LocationDialog';

import styles from '../Collection/collection.module.css';

type LocationModal = { type: 'preview'; card: DeckCardEntry } | { type: 'details' } | { type: 'delete' };

/** What is kept in one storage location, from every collection. */
export function Location(props: { locationId: string }) {
	const { locationId } = props;
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const modalHistory = useHistoryModal<LocationModal>(`location:${locationId}`);
	const modal = modalHistory.value;
	const location = useAppSelector((root) => selectLocation(root, locationId));
	const error = useAppSelector((root) => selectLocationError(root, locationId));
	const [collectionId, setCollectionId] = useState<string | null>(null);

	useEffect(() => {
		void dispatch(loadLocation(locationId));
		void dispatch(loadLibrary());
	}, [dispatch, locationId]);

	const openCard = useCallback((card: DeckCardEntry) => modalHistory.open({ type: 'preview', card }), [modalHistory.open]);
	const openCollection = useCallback((id: string) => navigate(`/collection/${id}`), [navigate]);

	if (!location) return <Page>{error ? <p className={styles.message}>{error}</p> : <LoadingIndicator />}</Page>;

	async function saveDetails(draft: LocationDraft) {
		await dispatch(describeStorageLocation(locationId, draft.name, draft.description));
		modalHistory.close();
	}

	const sources = Object.entries(location.collections);
	const totals: Record<string, number> = {};
	for (const bySource of Object.values(location.sources))
		for (const entry of Object.entries(bySource)) totals[entry[0]] = (totals[entry[0]] ?? 0) + entry[1];
	const items = (
		<>
			<button type="button" onClick={() => modalHistory.open({ type: 'details' })}>
				Edit name and description
			</button>
			<button type="button" className={styles.danger} onClick={() => modalHistory.open({ type: 'delete' })}>
				Delete location
			</button>
		</>
	);

	return (
		<Page chrome={{ mobile: items }}>
			{modal?.type === 'preview' && (
				<Modal key={modal.card.uuid} extraWide fullScreenOnMobile>
					<CardPreviewModal card={modal.card} onClose={modalHistory.close} />
				</Modal>
			)}
			{modal?.type === 'details' && (
				<LocationDialog location={{ name: location.name, description: location.description ?? '' }} onSave={saveDetails} onClose={modalHistory.close} />
			)}
			{modal?.type === 'delete' && (
				<ConfirmDialog
					title={`Delete “${location.name}”?`}
					confirmLabel="Delete location"
					busyLabel="Deleting…"
					danger
					failure="Unable to delete the storage location. Please try again."
					onCancel={modalHistory.close}
					onConfirm={async () => {
						await dispatch(deleteStorageLocation(locationId));
						navigate('/library', { replace: true });
					}}
				>
					{location.copies > 0 ? (
						<p>
							<strong>
								{location.copies.toLocaleString()} {location.copies === 1 ? 'copy is' : 'copies are'} filed here.
							</strong>{' '}
							They stay in {sources.map((entry) => entry[1]).join(', ')} and become unplaced. Nothing is removed from a collection.
						</p>
					) : (
						<p>Nothing is filed here.</p>
					)}
				</ConfirmDialog>
			)}
			<main className={styles.container}>
				<header className={styles.header}>
					<div className={styles.headerTop}>
						<BackLink to="/library">Library</BackLink>
					</div>
					<div className={styles.identity}>
						<h1>{location.name}</h1>
						<span className={styles.stats}>
							{location.description && <>{location.description} · </>}
							{location.copies.toLocaleString()} {location.copies === 1 ? 'copy' : 'copies'}
							{sources.length > 0 && ` from ${sources.length} ${sources.length === 1 ? 'collection' : 'collections'}`}
						</span>
						<div className={styles.actions}>
							<OverflowMenu label={`Actions for ${location.name}`}>{items}</OverflowMenu>
						</div>
					</div>
					{sources.length > 1 && (
						<div className={styles.chips} role="group" aria-label="Show copies from">
							<button type="button" aria-pressed={collectionId === null} onClick={() => setCollectionId(null)}>
								All <span>{location.copies.toLocaleString()}</span>
							</button>
							{sources.map((entry) => (
								<button key={entry[0]} type="button" aria-pressed={collectionId === entry[0]} onClick={() => setCollectionId(entry[0])}>
									{entry[1]} <span>{(totals[entry[0]] ?? 0).toLocaleString()}</span>
								</button>
							))}
						</div>
					)}
				</header>
				<LocationBoardReduxWidget locationId={locationId} collectionId={collectionId} onViewCard={openCard} onOpenCollection={openCollection} />
			</main>
		</Page>
	);
}

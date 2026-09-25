import React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Page } from '../../kit/components/Page/Page';
import { PageFrame } from '../../kit/components/Page/PageFrame';
import { DeckHeader } from './DeckHeader';
import { BoardVisualizationReduxWidget } from '../../features/boards/BoardVisualizationReduxWidget';
import {
	deckPageVisualization,
	deckViewShowsBoard
} from '../../features/boards/board-visualizations';
import type { BoardControlsProps } from '../../features/boards/board.types';
import { CardPreviewModal } from './components/EditCard';
import { ManagePrintings } from './components/ManagePrintings';
import { Modal } from './components/Modal';
import { GroupedDeck } from '../../../domain/deck/grouping';
import { DeckCardEntry } from '../../../domain/models/deck';
import type { DeckCardStep } from '../../../domain/deck/card-steps';
import {
	DeckCardEditTarget,
	DeckCardGroup,
	deckCardEditTarget
} from '../../../domain/deck/group-deck-cards';
import { Button } from '../../kit/components/Button/Button';
import { LoadingIndicator } from '../../kit/components/LoadingIndicator';
import { Spinner } from '../../kit/components/Spinner/Spinner';
import { AddCard } from './components/AddCard';
import { AddCardSingleMobile } from './components/AddCardSingleMobile';
import { AddCards } from './components/AddCards';
import { AddCardEventType } from './components/AddCard/AddCard';
import { useNavigate } from 'react-router-dom';
import { concatClassNames } from 'src/ui/kit/utils/concat-class-names';
import { DeckStats } from './components/DeckStats/DeckStats';
import type { DeckView } from '../../features/deck-chrome/DeckViewSwitch';
import { DeckNotes } from './components/DeckNotes/DeckNotes';

import styles from './deck.module.css';
import { deleteDeck, editDeckCards, loadDeck, loadDecks, renameDeck, saveDeckTags } from '../../../redux/decks/decks.thunks';
import { selectDeck, selectDeckCardAction, selectDeckError, selectDecks } from '../../../redux/decks/decks.selectors';
import { TagInput } from '../../kit/components/TagInput/TagInput';
import { knownDeckTags } from '../../../domain/deck/deck-groups';
import { setInitialDeck } from '../../../redux/decks/decksSlice';
import { useAppDispatch } from '../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../redux/use-app-selector';
import { closeAddCards, openAddCards } from '../../../redux/add-cards/addCardsSlice';
import { selectAddCards } from '../../../redux/add-cards/add-cards.selectors';
import { onAccent, readableAccent } from '../../../domain/appearance/card-palette';
import { DeckFullArtTop } from '../../kit/components/DeckFullArtTop/DeckFullArtTop';
import { DEFAULT_BANNER_CROP } from '../../../domain/appearance/banner-crop';
import { artworkOf } from '../../../domain/appearance/artwork';
import { deckTopBannerCard, deckTopStyle } from '../../../domain/appearance/deck-top-style';
import { ImageCardImport } from 'src/ui/kit/components/ImageCardImport/ImageCardImport';
import { useImageImportQueue } from 'src/ui/kit/utils/use-image-import-queue';
import { useWorkQueue } from 'src/ui/kit/utils/use-work-queue';
import { useIsPhoneLayout } from '../../kit/hooks/useIsPhoneLayout';
import { MobileDeckView } from './MobileDeckView';
import { useHistoryModal } from '../../kit/hooks/useHistoryModal';
import { SmallInputModal } from '../../kit/components/SmallInputModal/SmallInputModal';
import { DeleteDeckDialog } from './DeleteDeckDialog';
import { AddMissingDialog } from './components/AddMissingDialog/AddMissingDialog';
import { loadLibrary } from '../../../redux/library/library.thunks';
import { selectDeckOwnership } from '../../../redux/library/library.selectors';
import type { OwnershipFilter } from '../../../domain/library/ownership';

type DeckModal =
	| { type: 'manage-printings'; target: DeckCardEditTarget }
	| { type: 'card-preview'; card: DeckCardEntry }
	| { type: 'add-card' }
	| { type: 'add-cards' }
	| { type: 'image-import' }
	| { type: 'deck-details' }
	| { type: 'delete-deck' }
	/** Chooses the wanted collection to add the cards the deck lacks to. */
	| { type: 'add-missing' };

function SavingLabel() {
	return (
		<span
			className={styles['saving-label']}
			role="status"
			aria-live="polite"
		>
			<Spinner /> Saving…
		</span>
	);
}

export type DeckProps = {
	initialDeckData?: GroupedDeck;
	deckId: string;
	view?: DeckView;
};

export function Deck(props: DeckProps) {
	const { initialDeckData, deckId, view = 'list' } = props;
	const isPhoneLayout = useIsPhoneLayout();
	const navigate = useNavigate();
	const modalHistory = useHistoryModal<DeckModal>(`deck:${deckId}`);
	const storeDispatch = useAppDispatch();
	const data = useAppSelector((root) =>
		selectDeck(root, deckId)
	);
	const error = useAppSelector((root) =>
		selectDeckError(root, deckId)
	);
	const showInitialLoading = !data && !error;
	const [detailsDraft, setDetailsDraft] = useState<{
		deckId: string;
		name: string;
		tags: string[];
	} | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const cardActionError = useAppSelector(
		(root) =>
			selectDeckCardAction(root, deckId).error
	);
	const [bannerElement, setBannerElement] = useState<HTMLElement | null>(
		null
	);
	const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
	const ownership = useAppSelector((root) => selectDeckOwnership(root, deckId));
	const addCards = useAppSelector(selectAddCards);
	const modal = modalHistory.value;
	// Printings are serialized as a snapshot so Back/Forward cannot replace the
	// dialog's working set during a background deck refresh.
	const managingModal =
		modal?.type === 'manage-printings' ? modal.target : null;
	const cardPreviewModal = modal?.type === 'card-preview' ? modal.card : null;
	const showAddCardModal = modal?.type === 'add-card';
	const showAddCardsModal = modal?.type === 'add-cards';
	const showImageImportModal = modal?.type === 'image-import';
	const showDeckDetailsModal = modal?.type === 'deck-details';
	const showDeleteDeckModal = modal?.type === 'delete-deck';
	const showAddMissingModal = modal?.type === 'add-missing';
	const scanTasks = useImageImportQueue();
	const addedFromScans = scanTasks
		.filter((task) => task.deckId === deckId)
		.reduce(
			(total, task) =>
				total +
				Object.values(task.addedCounts).reduce(
					(sum, count) => sum + count,
					0
				),
			0
		);
	// Photos queued from a phone finish on a desktop; this page may be open on either.
	const addedFromQueuedWork = (useWorkQueue().items ?? [])
		.filter(
			(item) =>
				item.deck?.deckId === deckId && item.status === 'completed'
		)
		.reduce((total, item) => total + item.cardsAdded, 0);
	const draft = detailsDraft?.deckId === deckId ? detailsDraft : null;
	const name = draft?.name ?? data?.name ?? '';
	const tags = draft?.tags ?? data?.tags ?? [];
	const deckList = useAppSelector(selectDecks);
	const tagSuggestions = useMemo(() => knownDeckTags(deckList ?? []), [deckList]);
	const topBannerCard = data ? deckTopBannerCard(data) : undefined;

	const previewIcon = data?.icon;
	const bannerCrop = data?.bannerCrop ?? DEFAULT_BANNER_CROP;
	const topStyle = data ? deckTopStyle(data) : 'card';
	const visualization = deckPageVisualization(view, data?.boardVisualization);
	const { layout, controls: Controls } = visualization;
	// The server measured the icon's palette; it arrives with the deck, so the first paint is themed.
	const palette =
		data?.palette ?? artworkOf(data?.artwork, previewIcon)?.palette ?? null;
	const paletteStyle = palette
		? ({
				'--deck-accent': palette.accent,
				'--deck-accent-text': readableAccent(palette.accent, '#ffffff'),
				'--deck-page-accent': readableAccent(
					palette.accent,
					palette.wash
				),
				'--deck-banner-ink': readableAccent(
					palette.accent,
					palette.surface
				),
				'--deck-on-accent': onAccent(palette.accent),
				'--deck-on-surface': onAccent(palette.surface),
				'--deck-on-wash': onAccent(palette.wash),
				'--deck-surface': palette.surface,
				'--deck-wash': palette.wash,
				'--deck-border': palette.border
			} as React.CSSProperties)
		: undefined;

	const refreshDeck = useCallback(
		() => storeDispatch(loadDeck(deckId)),
		[deckId, storeDispatch]
	);

	useEffect(() => {
		if (initialDeckData)
			storeDispatch(setInitialDeck({ deckId, data: initialDeckData }));
		void refreshDeck();
	}, [deckId, initialDeckData, refreshDeck, storeDispatch]);

	// Which cards are owned comes from the library, read once for every deck.
	useEffect(() => {
		void storeDispatch(loadLibrary());
	}, [storeDispatch]);

	useLayoutEffect(() => {
		if (
			modal?.type === 'add-cards' &&
			(!addCards.open || addCards.deckId !== deckId)
		)
			storeDispatch(openAddCards({ deckId }));
	}, [addCards.deckId, addCards.open, deckId, modal?.type, storeDispatch]);

	// The add-cards modal belongs to this page; don't let it reappear on the next visit.
	useEffect(
		() =>
			function () {
				storeDispatch(closeAddCards());
			},
		[deckId, storeDispatch]
	);

	const savePrintingSteps = useCallback(
		async (steps: DeckCardStep[]) => {
			await storeDispatch(editDeckCards({ deckId, steps })).unwrap();
		},
		[deckId, storeDispatch]
	);
	const closeManaging = useCallback(
		() => modalHistory.close(),
		[modalHistory.close]
	);
	const closeDeckDetails = useCallback(() => {
		setDetailsDraft(null);
		modalHistory.close();
	}, [modalHistory.close]);

	/** Opens the card editor on every board's printings of the group's card. */
	function editCard(group: DeckCardGroup) {
		if (!data) return;
		modalHistory.open({
			type: 'manage-printings',
			target: deckCardEditTarget(
				group,
				data.cards.concat(data.sideboard ?? [])
			)
		});
	}

	async function deleteThisDeck() {
		await storeDispatch(deleteDeck(deckId));
		// Replace the dialog's history entry so Back doesn't reopen it.
		navigate('/', { replace: true });
	}

	async function saveDetails() {
		if (!data || !name.trim() || isSaving) return;
		const nextName = name.trim();
		const tagsChanged = tags.join('\n') !== (data.tags ?? []).join('\n');
		setSaveError(null);
		if (nextName === data.name && !tagsChanged) {
			setDetailsDraft(null);
			modalHistory.close();
			return;
		}
		setIsSaving(true);
		try {
			if (nextName !== data.name)
				await storeDispatch(renameDeck(deckId, nextName));
			if (tagsChanged) await storeDispatch(saveDeckTags(deckId, tags));
			setDetailsDraft(null);
			modalHistory.close();
		} catch {
			setSaveError('Unable to save deck details. Please try again.');
		} finally {
			setIsSaving(false);
		}
	}

	function openCard(card: DeckCardEntry) {
		modalHistory.open({ type: 'card-preview', card });
	}

	function onAddCardEvent(event: { type: AddCardEventType }) {
		switch (event.type) {
			case AddCardEventType.CLOSE:
			case AddCardEventType.SUBMIT:
				modalHistory.close();
				break;
		}
	}

	if (!data || showInitialLoading) {
		return (
			<Page>
				{!showInitialLoading && error ? (
					<p>{error}</p>
				) : (
					<LoadingIndicator />
				)}
			</Page>
		);
	}

	const headerArt =
		topStyle === 'full-art' ? (topBannerCard?.art ?? null) : previewIcon;

	const controls: BoardControlsProps = {
		deck: data,
		deckId,
		view,
		topStyle,
		bannerCrop,
		previewIcon: previewIcon ?? null,
		isSaving,
		errors: (saveError && !showDeckDetailsModal ? [saveError] : []).concat(
			cardActionError ? [cardActionError] : []
		),
		onBannerElement: setBannerElement,
		onAddCard: () => modalHistory.open({ type: 'add-card' }),
		onAddCards: () => {
			storeDispatch(openAddCards({ deckId }));
			modalHistory.open({ type: 'add-cards' });
		},
		onImportImage: () => modalHistory.open({ type: 'image-import' }),
		onEditName: () => {
			setDetailsDraft({ deckId, name: data.name, tags: data.tags ?? [] });
			// Suggest the tags other decks use.
			if (!deckList) void storeDispatch(loadDecks());
			setSaveError(null);
			modalHistory.open({ type: 'deck-details' });
		},
		onDeleteDeck: () => modalHistory.open({ type: 'delete-deck' }),
		ownership: ownership?.summary ?? null,
		ownershipFilter,
		onOwnershipFilter: setOwnershipFilter,
		onAddMissing: () => modalHistory.open({ type: 'add-missing' })
	};

	return (
		<PageFrame
			renderHeader={(backSlotRef) => (
				<DeckHeader
					backSlotRef={backSlotRef}
					name={data.name}
					art={headerArt}
					artInfo={artworkOf(data.artwork, headerArt)}
					artFrame={bannerCrop.mobile}
					banner={bannerElement}
					style={paletteStyle}
				/>
			)}
		>
			{error && <p role="alert">Unable to refresh deck.</p>}
			{showImageImportModal && (
				<ImageCardImport
					mode="add"
					deckId={deckId}
					onClose={modalHistory.close}
					onComplete={() => {
						modalHistory.close();
					}}
				/>
			)}
			{managingModal ? (
				<Modal key={managingModal.name} extraWide fullScreenOnMobile>
					<ManagePrintings
						target={managingModal}
						cards={data.cards
							.concat(data.sideboard ?? [])
							.filter((card) => card.name === managingModal.name)}
						onSteps={savePrintingSteps}
						onClose={closeManaging}
					/>
				</Modal>
			) : cardPreviewModal ? (
				<Modal key={cardPreviewModal.uuid} extraWide fullScreenOnMobile>
					<CardPreviewModal
						onClose={modalHistory.close}
						card={cardPreviewModal}
					/>
				</Modal>
			) : showAddCardModal ? (
				isPhoneLayout ? (
					<AddCardSingleMobile
						deckId={deckId}
						onEvent={onAddCardEvent}
					/>
				) : (
					<Modal>
						<AddCard deckId={deckId} onEvent={onAddCardEvent} />
					</Modal>
				)
			) : showAddCardsModal ? (
				<Modal fullScreenOnMobile>
					<AddCards onClose={modalHistory.close} />
				</Modal>
			) : showDeckDetailsModal ? (
				<SmallInputModal
					title="Name and tags"
					onClose={closeDeckDetails}
					closeDisabled={isSaving}
					busy={isSaving}
					actions={
						<>
							<Button
								onClick={closeDeckDetails}
								disabled={isSaving}
							>
								Cancel
							</Button>
							<Button
								variant="primary"
								onClick={() => {
									void saveDetails();
								}}
								disabled={!name.trim() || isSaving}
							>
								{isSaving ? <SavingLabel /> : 'Save'}
							</Button>
						</>
					}
				>
					<div className={styles['deck-details-fields']}>
						<label htmlFor="edit-deck-name">Deck name</label>
						<input
							autoFocus
							id="edit-deck-name"
							value={name}
							disabled={isSaving}
							maxLength={1024}
							enterKeyHint="done"
							onChange={(event) =>
								setDetailsDraft({
									deckId,
									name: event.target.value,
									tags
								})
							}
							onKeyDown={(event) => {
								if (event.key === 'Enter') void saveDetails();
							}}
						/>
						<label htmlFor="edit-deck-tags">Tags</label>
						<TagInput
							id="edit-deck-tags"
							tags={tags}
							suggestions={tagSuggestions}
							disabled={isSaving}
							placeholder="Add a tag, e.g. Cube"
							onChange={(next) =>
								setDetailsDraft({ deckId, name, tags: next })
							}
							onSubmit={() => void saveDetails()}
						/>
						<p className={styles['field-hint']}>
							Press Enter or comma after each tag. Tags put this
							deck into groups on the decks page.
						</p>
					</div>
					{saveError && (
						<p className={styles['save-error']} role="alert">
							{saveError}
						</p>
					)}
				</SmallInputModal>
			) : showAddMissingModal && data ? (
				<AddMissingDialog
					deckId={deckId}
					deckName={data.name}
					missingCopies={ownership?.summary.missingCopies ?? 0}
					onClose={modalHistory.close}
				/>
			) : showDeleteDeckModal && data ? (
				<DeleteDeckDialog
					deckName={data.name}
					onCancel={modalHistory.close}
					onDelete={deleteThisDeck}
				/>
			) : undefined}
			{isPhoneLayout ? (
				<MobileDeckView
					controls={controls}
					topBannerCard={topBannerCard}
					paletteStyle={paletteStyle}
					onEditCard={editCard}
					onViewCard={openCard}
				/>
			) : (
				<div
					className={concatClassNames([
						styles['deck-theme'],
						topStyle === 'full-art'
							? styles['full-art-theme']
							: undefined
					])}
					style={paletteStyle}
				>
					{topStyle === 'full-art' && topBannerCard && (
						<DeckFullArtTop
							ref={setBannerElement}
							src={topBannerCard.art}
							artInfo={artworkOf(data.artwork, topBannerCard.art)}
							crop={bannerCrop}
							name={data.name}
							cardCount={data.deck.count}
						/>
					)}
					<div
						className={concatClassNames([
							styles['index-container'],
							layout.controls === 'top'
								? styles['controls-top']
								: undefined,
							layout.width === 'full'
								? styles['full-width']
								: undefined,
							topStyle === 'full-art'
								? styles['full-index']
								: undefined
						])}
					>
						<div
							className={
								layout.controls === 'side'
									? styles['banner-container']
									: styles['controls-slot']
							}
						>
							<Controls
								deck={controls.deck}
								deckId={controls.deckId}
								view={controls.view}
								topStyle={controls.topStyle}
								bannerCrop={controls.bannerCrop}
								previewIcon={controls.previewIcon}
								isSaving={controls.isSaving}
								errors={controls.errors}
								onBannerElement={controls.onBannerElement}
								onAddCard={controls.onAddCard}
								onAddCards={controls.onAddCards}
								onImportImage={controls.onImportImage}
								onEditName={controls.onEditName}
								onDeleteDeck={controls.onDeleteDeck}
								ownership={controls.ownership}
								ownershipFilter={controls.ownershipFilter}
								onOwnershipFilter={controls.onOwnershipFilter}
								onAddMissing={controls.onAddMissing}
							/>
						</div>
						{deckViewShowsBoard(view) ? (
							<BoardVisualizationReduxWidget
								visualization={visualization.id}
								deckId={deckId}
								ownershipFilter={ownershipFilter}
								onViewCard={openCard}
								onEditCard={editCard}
							/>
						) : view === 'stats' ? (
							<DeckStats cards={data.cards} />
						) : (
							<DeckNotes
								deckId={deckId}
								notes={data.notes ?? []}
							/>
						)}
					</div>
				</div>
			)}
		</PageFrame>
	);
}

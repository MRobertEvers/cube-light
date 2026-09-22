import React from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Page } from '../../components/Page/Page';
import { PageFrame } from '../../components/Page/PageFrame';
import { DeckHeader } from './DeckHeader';
import { Decklist } from './components/Decklist/Decklist';
import { Tabletop } from './components/Tabletop/Tabletop';
import { CardPreviewModal } from './components/EditCard';
import { ManagePrintings } from './components/ManagePrintings';
import { Modal } from './components/Modal';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import {
	DeckCardsEdit,
	fetchAPIEditDeckCards
} from '../../api/fetch-api-edit-deck-card';
import type { DeckCardGroup } from '../../utils/group-deck-cards';
import { Button } from '../../components/Button/Button';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { Spinner } from '../../components/Spinner/Spinner';
import { DeckStatsSummary } from './components/DeckStatsSummary/DeckStatsSummary';
import { AddCard } from './components/AddCard';
import { AddCardSingleMobile } from './components/AddCardSingleMobile';
import { AddCards } from './components/AddCards';
import { AddCardEventType } from './components/AddCard/AddCard';
import { fetchAPIDeleteDeck } from 'src/api/fetch-api-delete-deck';
import { Link, useNavigate } from 'react-router-dom';
import { concatClassNames } from 'src/utils/concat-class-names';
import { DeckControlIcon } from './DeckControlIcons';

import styles from './deck.module.css';
import {
	loadDeck,
	selectDeck,
	selectDeckError,
	setInitialDeck
} from '../../store/decks/decks.state';
import { useAppDispatch } from '../../store/use-app-dispatch';
import {
	closeAddCards,
	openAddCards,
	selectAddCards
} from '../../store/add-cards/add-cards.state';
import {
	onAccent,
	readableAccent,
	useCardPalette
} from '../../utils/card-palette';
import { fetchAPIUpdateDeck } from '../../api/fetch-api-update-deck';
import { DeckBannerCard } from '../../components/DeckBannerCard/DeckBannerCard';
import { DeckFullArtTop } from '../../components/DeckFullArtTop/DeckFullArtTop';
import { DEFAULT_BANNER_CROP } from '../../utils/banner-crop';
import { useMinimumVisible } from '../../hooks/useMinimumVisible';
import { withMinimumStatusDuration } from '../../utils/minimum-status-duration';
import { ImageCardImport } from 'src/components/ImageCardImport/ImageCardImport';
import { DeckImageScanCard } from 'src/components/ImageCardImport/DeckImageScanCard';
import { useImageImportQueue } from 'src/utils/use-image-import-queue';
import { useWorkQueue } from 'src/utils/work-queue';
import { useIsPhoneLayout } from '../../hooks/useIsPhoneLayout';
import { MobileDeckView } from './MobileDeckView';
import { useHistoryModal } from '../../hooks/useHistoryModal';

type DeckModal =
	| { type: 'manage-printings'; group: DeckCardGroup }
	| { type: 'card-preview'; card: FetchAPIDeckCardResponse }
	| { type: 'add-card' }
	| { type: 'add-cards' }
	| { type: 'image-import' }
	| { type: 'deck-details' };

export type DeckControlButtonsProps = {
	view: 'list' | 'tabletop';
	deckId: string;
	onEditName: () => void;
	onAddCard: () => void;
	onImportImage: () => void;
	onAddCards: () => void;
	isSaving: boolean;
};

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

export function DeckControlButtons(props: DeckControlButtonsProps) {
	const {
		view,
		onEditName,
		onAddCard,
		onImportImage,
		onAddCards,
		isSaving,
		deckId
	} = props;

	const navigate = useNavigate();

	return (
		<div className={styles['deck-controls']}>
			<nav className={styles['deck-view-switch']} aria-label="Deck view">
				<Link
					to={`/deck/${deckId}`}
					aria-current={view === 'list' ? 'page' : undefined}
				>
					Deck list
				</Link>
				<Link
					to={`/deck/${deckId}/tabletop`}
					aria-current={view === 'tabletop' ? 'page' : undefined}
				>
					Tabletop
				</Link>
			</nav>
			<div className={styles['deck-edit-panel-body']}>
				<section className={styles['deck-control-group']}>
					<h2 className={styles['deck-control-label']}>Add cards</h2>
					<div className={styles['deck-add-tiles']}>
						<Button
							className={styles['deck-add-tile']}
							onClick={onAddCard}
							disabled={isSaving}
						>
							<DeckControlIcon name="search" />
							<span>Search</span>
							<span className={styles['deck-add-tile-hint']}>
								one card
							</span>
						</Button>
						<Button
							className={styles['deck-add-tile']}
							onClick={onAddCards}
							disabled={isSaving}
						>
							<DeckControlIcon name="list" />
							<span>Paste list</span>
							<span className={styles['deck-add-tile-hint']}>
								many cards
							</span>
						</Button>
						<Button
							className={styles['deck-add-tile']}
							onClick={onImportImage}
							disabled={isSaving}
						>
							<DeckControlIcon name="camera" />
							<span>Scan image</span>
							<span className={styles['deck-add-tile-hint']}>
								from a photo
							</span>
						</Button>
					</div>
				</section>
				<section className={styles['deck-control-group']}>
					<h2 className={styles['deck-control-label']}>Deck</h2>
					<div className={styles['deck-control-row']}>
						<Button
							className={styles['deck-control-button']}
							onClick={onEditName}
							disabled={isSaving}
						>
							Rename
						</Button>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/history`)}
						>
							History
						</Button>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/settings`)}
						>
							Appearance
						</Button>
						<Button
							className={concatClassNames(
								styles['deck-control-button'],
								styles['delete-deck-button']
							)}
							disabled={isSaving}
							onClick={async () => {
								await fetchAPIDeleteDeck(deckId);
								navigate('/');
							}}
						>
							Delete
						</Button>
					</div>
				</section>
			</div>
		</div>
	);
}
export type DeckProps = {
	initialDeckData?: GetDeckResponse;
	deckId: string;
	view?: 'list' | 'tabletop';
};

export function Deck(props: DeckProps) {
	const { initialDeckData, deckId, view = 'list' } = props;
	const isPhoneLayout = useIsPhoneLayout();
	const navigate = useNavigate();
	const modalHistory = useHistoryModal<DeckModal>(`deck:${deckId}`);
	const storeDispatch = useAppDispatch();
	const data = useSelector((root: Parameters<typeof selectDeck>[0]) =>
		selectDeck(root, deckId)
	);
	const error = useSelector((root: Parameters<typeof selectDeckError>[0]) =>
		selectDeckError(root, deckId)
	);
	const showInitialLoading = useMinimumVisible(!data && !error);
	const [detailsDraft, setDetailsDraft] = useState<{
		deckId: string;
		name: string;
	} | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [deletingCardName, setDeletingCardName] = useState<string | null>(
		null
	);
	const [cardActionError, setCardActionError] = useState<string | null>(null);
	const [bannerElement, setBannerElement] = useState<HTMLElement | null>(
		null
	);
	const addCards = useSelector(selectAddCards);
	const modal = modalHistory.value;
	// Printings are serialized as a snapshot so Back/Forward cannot replace the
	// dialog's working set during a background deck refresh.
	const managingModal =
		modal?.type === 'manage-printings' ? modal.group : null;
	const cardPreviewModal = modal?.type === 'card-preview' ? modal.card : null;
	const showAddCardModal = modal?.type === 'add-card';
	const showAddCardsModal = modal?.type === 'add-cards';
	const showImageImportModal = modal?.type === 'image-import';
	const showDeckDetailsModal = modal?.type === 'deck-details';
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
	const bannerCards = data?.cards.filter((card) => !!card.art) ?? [];
	const selectedBanner =
		data?.bannerCard ??
		bannerCards.find((card) => card.uuid === data?.bannerCardUuid);
	const topBannerCard = selectedBanner ?? bannerCards[0];

	const previewIcon = data?.icon;
	const bannerCrop = data?.bannerCrop ?? DEFAULT_BANNER_CROP;
	const topStyle = data?.topStyle === 'full-art' ? 'full-art' : 'card';
	const generatedPalette = useCardPalette(previewIcon);
	const palette = data?.palette ?? generatedPalette;
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

	useEffect(() => {
		if (addedFromScans + addedFromQueuedWork > 0) void refreshDeck();
	}, [addedFromScans, addedFromQueuedWork, refreshDeck]);

	// Appearance settings may be saved from another tab; pick those changes up on return.
	useEffect(() => {
		function onVisible() {
			if (document.visibilityState === 'visible') void refreshDeck();
		}
		document.addEventListener('visibilitychange', onVisible);
		return function () {
			return document.removeEventListener('visibilitychange', onVisible);
		};
	}, [refreshDeck]);

	const savePrintings = useCallback(
		async (edit: DeckCardsEdit) => {
			await fetchAPIEditDeckCards(deckId, edit);
			await refreshDeck();
			modalHistory.close();
		},
		[deckId, modalHistory.close, refreshDeck]
	);
	const closeManaging = useCallback(
		() => modalHistory.close(),
		[modalHistory.close]
	);

	async function saveName() {
		if (!data || !name.trim() || isSaving) return;
		const nextName = name.trim();
		setSaveError(null);
		if (nextName === data.name) {
			setDetailsDraft(null);
			modalHistory.close();
			return;
		}
		setIsSaving(true);
		let saved = false;
		try {
			await withMinimumStatusDuration(async () => {
				await fetchAPIUpdateDeck(deckId, nextName);
				saved = true;
				await refreshDeck().unwrap();
			});
			setDetailsDraft(null);
			modalHistory.close();
		} catch {
			setSaveError(
				saved
					? 'Deck saved, but could not refresh. Please try again.'
					: 'Unable to save deck details. Please try again.'
			);
		} finally {
			setIsSaving(false);
		}
	}

	function openCard(card: FetchAPIDeckCardResponse) {
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

	async function deleteMobileCard(group: DeckCardGroup) {
		if (deletingCardName) return;
		setCardActionError(null);
		setDeletingCardName(group.name);
		try {
			await fetchAPIEditDeckCards(deckId, {
				remove: group.printings.map((card) => card.uuid),
				upsert: []
			});
			await refreshDeck().unwrap();
		} catch {
			setCardActionError(
				`Unable to delete ${group.name}. Please try again.`
			);
		} finally {
			setDeletingCardName(null);
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

	return (
		<PageFrame
			renderHeader={(backSlotRef) => (
				<DeckHeader
					backSlotRef={backSlotRef}
					name={data.name}
					art={
						topStyle === 'full-art'
							? (topBannerCard?.art ?? null)
							: previewIcon
					}
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
						void refreshDeck();
					}}
				/>
			)}
			{managingModal ? (
				<Modal key={managingModal.name} extraWide fullScreenOnMobile>
					<ManagePrintings
						group={managingModal}
						onSave={savePrintings}
						onCancel={closeManaging}
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
					<Modal>
						<AddCardSingleMobile
							deckId={deckId}
							onEvent={onAddCardEvent}
						/>
					</Modal>
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
				<Modal>
					<section
						className={styles['deck-details-modal']}
						role="dialog"
						aria-modal="true"
						aria-labelledby="deck-details-title"
					>
						<h2 id="deck-details-title">Edit deck name</h2>
						<div className={styles['deck-details-fields']}>
							<label htmlFor="edit-deck-name">Deck name</label>
							<input
								autoFocus
								id="edit-deck-name"
								value={name}
								disabled={isSaving}
								maxLength={1024}
								onChange={(event) =>
									setDetailsDraft({
										deckId,
										name: event.target.value
									})
								}
								onKeyDown={(event) => {
									if (event.key === 'Enter') void saveName();
								}}
							/>
						</div>
						{saveError && (
							<p className={styles['save-error']} role="alert">
								{saveError}
							</p>
						)}
						<div className={styles['deck-details-actions']}>
							<Button
								onClick={() => {
									setDetailsDraft(null);
									modalHistory.close();
								}}
								disabled={isSaving}
							>
								Cancel
							</Button>
							<Button
								onClick={() => {
									void saveName();
								}}
								disabled={!name.trim() || isSaving}
							>
								{isSaving ? <SavingLabel /> : 'Save name'}
							</Button>
						</div>
					</section>
				</Modal>
			) : undefined}
			{isPhoneLayout ? (
				<MobileDeckView
					data={data}
					deckId={deckId}
					view={view}
					bannerCrop={bannerCrop}
					topStyle={topStyle}
					topBannerCard={topBannerCard}
					previewIcon={previewIcon}
					paletteStyle={paletteStyle}
					isSaving={isSaving}
					deletingCardName={deletingCardName}
					cardActionError={cardActionError}
					onBannerElement={setBannerElement}
					onAddCard={() => modalHistory.open({ type: 'add-card' })}
					onAddCards={() => {
						storeDispatch(openAddCards({ deckId }));
						modalHistory.open({ type: 'add-cards' });
					}}
					onImportImage={() =>
						modalHistory.open({ type: 'image-import' })
					}
					onEditName={() => {
						setDetailsDraft({ deckId, name: data.name });
						setSaveError(null);
						modalHistory.open({ type: 'deck-details' });
					}}
					onDeleteDeck={async () => {
						await fetchAPIDeleteDeck(deckId);
						navigate('/');
					}}
					onEditCard={(group) =>
						modalHistory.open({
							type: 'manage-printings',
							group
						})
					}
					onViewCard={(card) =>
						modalHistory.open({ type: 'card-preview', card })
					}
					onDeleteCard={deleteMobileCard}
				/>
			) : (
				<div
					className={concatClassNames(
						styles['deck-theme'],
						topStyle === 'full-art'
							? styles['full-art-theme']
							: undefined
					)}
					style={paletteStyle}
				>
					{topStyle === 'full-art' && topBannerCard && (
						<DeckFullArtTop
							ref={setBannerElement}
							src={topBannerCard.art}
							crop={bannerCrop}
							name={data.name}
							cardCount={data.deck.count}
						/>
					)}
					<div
						className={concatClassNames(
							styles['index-container'],
							view === 'tabletop'
								? styles['tabletop-index']
								: undefined,
							topStyle === 'full-art'
								? styles['full-index']
								: undefined
						)}
					>
						<div className={styles['banner-container']}>
							{topStyle === 'card' && (
								<DeckBannerCard
									ref={setBannerElement}
									src={previewIcon}
									crop={bannerCrop}
									name={data.name}
									cardCount={data.deck.count}
									updatedAt={data.lastEdit}
									variant={
										view === 'tabletop'
											? 'mobile'
											: 'responsive'
									}
								/>
							)}
							<DeckControlButtons
								view={view}
								deckId={deckId}
								onEditName={() => {
									setDetailsDraft({
										deckId,
										name: data.name
									});
									setSaveError(null);
									modalHistory.open({
										type: 'deck-details'
									});
								}}
								onAddCard={() =>
									modalHistory.open({ type: 'add-card' })
								}
								onImportImage={() =>
									modalHistory.open({ type: 'image-import' })
								}
								onAddCards={() => {
									storeDispatch(openAddCards({ deckId }));
									modalHistory.open({ type: 'add-cards' });
								}}
								isSaving={isSaving}
							/>
							<DeckImageScanCard deckId={deckId} />
							{saveError && !showDeckDetailsModal && (
								<p
									className={styles['save-error']}
									role="alert"
								>
									{saveError}
								</p>
							)}
							<DeckStatsSummary deck={data} />
						</div>
						{view === 'tabletop' ? (
							<Tabletop
								cards={data.cards}
								onCardClick={openCard}
							/>
						) : (
							<Decklist
								name={name}
								deck={data.deck}
								banner={
									topBannerCard
										? {
												art: topBannerCard.art,
												name: topBannerCard.name
											}
										: null
								}
								bannerCrop={bannerCrop}
								bannerBlend={data.bannerBlend}
								topStyle={topStyle}
								onCardClick={openCard}
								onManagePrintings={(group) =>
									modalHistory.open({
										type: 'manage-printings',
										group
									})
								}
							/>
						)}
					</div>
				</div>
			)}
		</PageFrame>
	);
}

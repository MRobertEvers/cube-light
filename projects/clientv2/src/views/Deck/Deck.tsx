import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Page } from '../../components/Page/Page';
import { PageFrame } from '../../components/Page/PageFrame';
import { DeckHeader } from './DeckHeader';
import { Decklist } from './components/Decklist/Decklist';
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
import { useQueryState } from 'src/hooks/useQueryState';
import { reducer, initialState, Actions } from './deck-state';
import { AddCard } from './components/AddCard';
import { AddCards } from './components/AddCards';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';
import { AddCardEventType } from './components/AddCard/AddCard';
import { fetchAPIDeleteDeck } from 'src/api/fetch-api-delete-deck';
import { useNavigate } from 'react-router-dom';
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

export type DeckControlButtonsProps = {
	dispatch: any;
	deckId: string;
	isEditMode: boolean;
	onEdit: () => void;
	onEditName: () => void;
	onDone: () => void;
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
		dispatch,
		isEditMode,
		onEdit,
		onEditName,
		onDone,
		onImportImage,
		onAddCards,
		isSaving,
		deckId
	} = props;

	const navigate = useNavigate();

	// The toggle expands the edit actions in place; edits save as they are made, so collapsing
	// the panel is all "done" needs to do.
	return (
		<div className={styles['deck-controls']}>
			<Button
				className={styles['edit-deck-button']}
				onClick={isEditMode ? onDone : onEdit}
				disabled={isSaving}
				ariaExpanded={isEditMode}
				ariaControls="deck-edit-panel"
			>
				Edit deck
				<DeckControlIcon
					name="chevron"
					size={16}
					className={styles['edit-deck-chevron']}
				/>
			</Button>
			<div
				className={concatClassNames(
					styles['deck-collapse'],
					!isEditMode ? styles['open'] : undefined
				)}
				inert={isEditMode}
			>
				<div className={styles['deck-collapse-inner']}>
					<nav
						className={styles['deck-control-pair']}
						aria-label="Deck links"
					>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/history`)}
						>
							Edit history
						</Button>
						<Button
							className={styles['deck-control-button']}
							onClick={() => navigate(`/deck/${deckId}/settings`)}
						>
							Appearance
						</Button>
					</nav>
				</div>
			</div>
			<div
				id="deck-edit-panel"
				className={concatClassNames(
					styles['deck-collapse'],
					isEditMode ? styles['open'] : undefined
				)}
				inert={!isEditMode}
			>
				<div className={styles['deck-collapse-inner']}>
					<div className={styles['deck-edit-panel-body']}>
						<section className={styles['deck-control-group']}>
							<h2 className={styles['deck-control-label']}>
								Add cards
							</h2>
							<div className={styles['deck-add-tiles']}>
								<Button
									className={styles['deck-add-tile']}
									onClick={() =>
										dispatch(Actions.setViewAddCard(true))
									}
									disabled={isSaving}
								>
									<DeckControlIcon name="search" />
									<span>Search</span>
									<span
										className={styles['deck-add-tile-hint']}
									>
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
									<span
										className={styles['deck-add-tile-hint']}
									>
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
									<span
										className={styles['deck-add-tile-hint']}
									>
										from a photo
									</span>
								</Button>
							</div>
						</section>
						<section className={styles['deck-control-group']}>
							<h2 className={styles['deck-control-label']}>
								Deck
							</h2>
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
									onClick={() =>
										navigate(`/deck/${deckId}/settings`)
									}
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
			</div>
		</div>
	);
}
export type DeckProps = {
	initialDeckData?: GetDeckResponse;
	deckId: string;
};

export function Deck(props: DeckProps) {
	const { initialDeckData, deckId } = props;
	const [state, dispatch] = useAsyncReducer(reducer, initialState);
	const storeDispatch = useAppDispatch();
	const { viewEditCard, viewAddCard } = state;
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
	const [showDetailsModal, setShowDetailsModal] = useState(false);
	// A snapshot of the card's printings when the dialog opened, so a refresh can't reset it.
	const [managing, setManaging] = useState<DeckCardGroup | null>(null);
	const [showImageImport, setShowImageImport] = useState(false);
	const [bannerElement, setBannerElement] = useState<HTMLElement | null>(
		null
	);
	const addCards = useSelector(selectAddCards);
	const showAddCards = addCards.open && addCards.deckId === deckId;
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
	const nameInputRef = useRef<HTMLInputElement>(null);
	const draft = detailsDraft?.deckId === deckId ? detailsDraft : null;
	const name = draft?.name ?? data?.name ?? '';
	const bannerCards = data?.cards.filter((card) => !!card.art) ?? [];
	const selectedBanner =
		data?.bannerCard ??
		bannerCards.find((card) => card.uuid === data?.bannerCardUuid);
	const topBannerCard = selectedBanner ?? bannerCards[0];

	const [isEditMode, setIsEditMode] = useQueryState('edit', {
		parse: (value: string) => value === 'true',
		serialize: (value: boolean) => value.toString()
	});
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

	const setEditing = (editing: boolean) => {
		setDetailsDraft(null);
		setSaveError(null);
		setIsEditMode(editing);
	};

	const refreshDeck = useCallback(
		() => storeDispatch(loadDeck(deckId)),
		[deckId, storeDispatch]
	);

	useEffect(() => {
		if (initialDeckData)
			storeDispatch(setInitialDeck({ deckId, data: initialDeckData }));
		void refreshDeck();
	}, [deckId, initialDeckData, refreshDeck, storeDispatch]);

	// The add-cards modal belongs to this page; don't let it reappear on the next visit.
	useEffect(
		() => () => {
			storeDispatch(closeAddCards());
		},
		[deckId, storeDispatch]
	);

	useEffect(() => {
		if (addedFromScans > 0) void refreshDeck();
	}, [addedFromScans, refreshDeck]);

	// Appearance settings may be saved from another tab; pick those changes up on return.
	useEffect(() => {
		const onVisible = () => {
			if (document.visibilityState === 'visible') void refreshDeck();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () =>
			document.removeEventListener('visibilitychange', onVisible);
	}, [refreshDeck]);

	useEffect(() => {
		if (showDetailsModal) nameInputRef.current?.focus();
	}, [showDetailsModal]);

	const savePrintings = useCallback(
		async (edit: DeckCardsEdit) => {
			await fetchAPIEditDeckCards(deckId, edit);
			await refreshDeck();
			setManaging(null);
		},
		[deckId, refreshDeck]
	);
	const closeManaging = useCallback(() => setManaging(null), []);

	const saveName = async () => {
		if (!data || !name.trim() || isSaving) return;
		const nextName = name.trim();
		setSaveError(null);
		if (nextName === data.name) {
			setDetailsDraft(null);
			setShowDetailsModal(false);
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
			setShowDetailsModal(false);
		} catch {
			setSaveError(
				saved
					? 'Deck saved, but could not refresh. Please try again.'
					: 'Unable to save deck details. Please try again.'
			);
		} finally {
			setIsSaving(false);
		}
	};

	if (!data || showInitialLoading) {
		return (
			<Page>
				{!showInitialLoading && error ? (
					<p>Unable to load deck.</p>
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
					isEditMode={!!isEditMode}
					onToggleEdit={() => setEditing(!isEditMode)}
					isSaving={isSaving}
					style={paletteStyle}
				/>
			)}
		>
			{error && <p role="alert">Unable to refresh deck.</p>}
			{showImageImport && (
				<ImageCardImport
					mode="add"
					deckId={deckId}
					onClose={() => setShowImageImport(false)}
					onComplete={() => {
						setShowImageImport(false);
						void refreshDeck();
					}}
				/>
			)}
			{managing ? (
				<Modal extraWide fullScreenOnMobile>
					<ManagePrintings
						group={managing}
						onSave={savePrintings}
						onCancel={closeManaging}
					/>
				</Modal>
			) : viewEditCard ? (
				<Modal extraWide fullScreenOnMobile>
					<CardPreviewModal
						onClose={() => dispatch(Actions.setEditCard(null))}
						card={viewEditCard}
					/>
				</Modal>
			) : viewAddCard ? (
				<Modal fullScreenOnMobile>
					<AddCard
						deckId={deckId}
						onEvent={(e) => {
							switch (e.type) {
								case AddCardEventType.CLOSE:
									dispatch(Actions.setViewAddCard(false));
									break;
								case AddCardEventType.SUBMIT:
									dispatch(Actions.setViewAddCard(false));
									break;
							}
						}}
					/>
				</Modal>
			) : showAddCards ? (
				<Modal fullScreenOnMobile>
					<AddCards />
				</Modal>
			) : showDetailsModal ? (
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
								ref={nameInputRef}
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
									setShowDetailsModal(false);
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
			<div className={styles['deck-theme']} style={paletteStyle}>
				{topStyle === 'full-art' && topBannerCard && (
					<DeckFullArtTop
						ref={setBannerElement}
						src={topBannerCard.art}
						crop={bannerCrop}
						name={topBannerCard.name}
					/>
				)}
				<div
					className={concatClassNames(
						styles['index-container'],
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
								updatedAt={data.lastEdit}
							/>
						)}
						<DeckControlButtons
							deckId={deckId}
							dispatch={dispatch}
							isEditMode={!!isEditMode}
							onEdit={() => setEditing(true)}
							onEditName={() => {
								setDetailsDraft({ deckId, name: data.name });
								setSaveError(null);
								setShowDetailsModal(true);
							}}
							onDone={() => setEditing(false)}
							onImportImage={() => setShowImageImport(true)}
							onAddCards={() =>
								storeDispatch(openAddCards({ deckId }))
							}
							isSaving={isSaving}
						/>
						<DeckImageScanCard deckId={deckId} />
						{saveError && !showDetailsModal && (
							<p className={styles['save-error']} role="alert">
								{saveError}
							</p>
						)}
						<DeckStatsSummary deck={data} />
					</div>
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
						editable={!!isEditMode}
						onCardClick={(
							card: FetchAPIDeckCardResponse,
							group: DeckCardGroup
						) => {
							if (isEditMode) setManaging(group);
							else dispatch(Actions.setEditCard(card));
						}}
						onManagePrintings={setManaging}
					/>
				</div>
			</div>
		</PageFrame>
	);
}

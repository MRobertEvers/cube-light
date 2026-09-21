import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Page } from '../../components/Page/Page';
import { Decklist } from './components/Decklist/Decklist';
import { EditCardModal } from './components/EditCard';
import { Modal } from './components/Modal';
import { GetDeckResponse } from '../../workers/deck.worker.messages';
import { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import { fetchAPISetCard } from '../../api/fetch-api-set-card';
import { Button } from '../../components/Button/Button';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { Spinner } from '../../components/Spinner/Spinner';
import { DeckStatsSummary } from './components/DeckStatsSummary/DeckStatsSummary';
import { useQueryState } from 'src/hooks/useQueryState';
import { reducer, initialState, Actions } from './deck-state';
import { AddCard } from './components/AddCard';
import { useAsyncReducer } from 'src/hooks/useAsyncReducer';
import { AddCardEventType } from './components/AddCard/AddCard';
import { fetchAPIDeleteDeck } from 'src/api/fetch-api-delete-deck';
import { Link, useNavigate } from 'react-router-dom';
import { concatClassNames } from 'src/utils/concat-class-names';

import styles from './deck.module.css';
import { loadDeck, selectDeck, selectDeckError, setInitialDeck } from '../../store/decks/decks.state';
import { useAppDispatch } from '../../store/use-app-dispatch';
import { onAccent, readableAccent, useCardPalette } from '../../utils/card-palette';
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
	isSaving: boolean;
};

function SavingLabel() {
	return <span className={styles['saving-label']} role="status" aria-live="polite">
		<Spinner /> Saving…
	</span>;
}

export function DeckControlButtons(props: DeckControlButtonsProps) {
	const { dispatch, isEditMode, onEdit, onEditName, onDone, onImportImage, isSaving, deckId } = props;

	const navigate = useNavigate();

	return (
		<div className={styles['edit-deck-button-container']}>
			<div className={concatClassNames(styles['control-mode'], isEditMode ? styles['inactive'] : undefined)} aria-hidden={isEditMode}>
				<Button className={styles['edit-deck-button']} onClick={onEdit} disabled={isSaving}>
					Edit deck
				</Button>
				<nav className={styles['secondary-links']} aria-label="Deck links">
					<Link to={`/deck/${deckId}/history`}>Edit history</Link>
					<Link to={`/deck/${deckId}/settings`}>Appearance settings</Link>
				</nav>
			</div>
			<div className={concatClassNames(styles['control-mode'], !isEditMode ? styles['inactive'] : undefined)} aria-hidden={!isEditMode}>
				<Button
					className={styles['edit-deck-button']}
					onClick={onDone}
					disabled={isSaving}
				>
					Save and close
				</Button>
				<div className={styles['secondary-links']}>
					<button className={styles['secondary-action']} onClick={onEditName} disabled={isSaving}>
						Edit deck name
					</button>
					<button className={styles['secondary-action']} onClick={onImportImage} disabled={isSaving}>
						Add cards in image
					</button>
					<button
						className={styles['secondary-action']}
						onClick={() => dispatch(Actions.setViewAddCard(true))}
						disabled={isSaving}
					>
						Add card
					</button>
					<Link to={`/deck/${deckId}/settings`}>Appearance settings</Link>
					<button
						className={concatClassNames(styles['secondary-action'], styles['delete-deck-button'])}
						disabled={isSaving}
						onClick={async () => {
							await fetchAPIDeleteDeck(deckId);
							navigate('/');
						}}
					>
						Delete
					</button>
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
	const data = useSelector((root: Parameters<typeof selectDeck>[0]) => selectDeck(root, deckId));
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
	const [showImageImport, setShowImageImport] = useState(false);
	const scanTasks = useImageImportQueue();
	const addedFromScans = scanTasks.filter((task) => task.deckId === deckId)
		.reduce((total, task) => total + Object.values(task.addedCounts).reduce((sum, count) => sum + count, 0), 0);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const draft = detailsDraft?.deckId === deckId ? detailsDraft : null;
	const name = draft?.name ?? data?.name ?? '';
	const bannerCards = data?.cards.filter((card) => !!card.art) ?? [];
	const selectedBanner = data?.bannerCard ?? bannerCards.find((card) => card.uuid === data?.bannerCardUuid);
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
	const paletteStyle = palette ? {
		'--deck-accent': palette.accent,
		'--deck-accent-text': readableAccent(palette.accent, '#ffffff'),
		'--deck-page-accent': readableAccent(palette.accent, palette.wash),
		'--deck-banner-ink': readableAccent(palette.accent, palette.surface),
		'--deck-on-accent': onAccent(palette.accent),
		'--deck-on-surface': onAccent(palette.surface),
		'--deck-on-wash': onAccent(palette.wash),
		'--deck-surface': palette.surface,
		'--deck-wash': palette.wash,
		'--deck-border': palette.border
	} as React.CSSProperties : undefined;

	const refreshDeck = useCallback(() => storeDispatch(loadDeck(deckId)), [deckId, storeDispatch]);

	useEffect(() => {
		if (initialDeckData) storeDispatch(setInitialDeck({ deckId, data: initialDeckData }));
		void refreshDeck();
	}, [deckId, initialDeckData, refreshDeck, storeDispatch]);

	useEffect(() => {
		if (addedFromScans > 0) void refreshDeck();
	}, [addedFromScans, refreshDeck]);

	useEffect(() => {
		if (showDetailsModal) nameInputRef.current?.focus();
	}, [showDetailsModal]);

	const onSubmitChange = useCallback(async (card: FetchAPIDeckCardResponse) => {
		await fetchAPISetCard(deckId, card.name, 'set', card.count);
		dispatch(Actions.setEditCard(null));
		await refreshDeck();
	}, [deckId, dispatch, refreshDeck]);

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
			setSaveError(saved
				? 'Deck saved, but could not refresh. Please try again.'
				: 'Unable to save deck details. Please try again.');
		} finally {
			setIsSaving(false);
		}
	};

	if (!data || showInitialLoading) {
		return (
			<Page>
				{!showInitialLoading && error ? <p>Unable to load deck.</p> : <LoadingIndicator />}
			</Page>
		);
	}

	return (
		<Page>
			{error && <p role="alert">Unable to refresh deck.</p>}
			{showImageImport && <ImageCardImport
				mode="add"
				deckId={deckId}
				onClose={() => setShowImageImport(false)}
				onComplete={() => { setShowImageImport(false); void refreshDeck(); }}
			/>}
			{viewEditCard ? (
				<Modal>
					{/* <CardDetailView onEvent={() => {}} cardUuid={viewEditCard.uuid} /> */}
					<EditCardModal
						onSubmit={onSubmitChange}
						onCancel={() => dispatch(Actions.setEditCard(null))}
						card={viewEditCard}
					/>
				</Modal>
			) : viewAddCard ? (
				<Modal>
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
			) : showDetailsModal ? (
				<Modal>
					<section className={styles['deck-details-modal']} role="dialog" aria-modal="true" aria-labelledby="deck-details-title">
						<h2 id="deck-details-title">Edit deck name</h2>
						<div className={styles['deck-details-fields']}>
							<label htmlFor="edit-deck-name">Deck name</label>
							<input
								ref={nameInputRef}
								id="edit-deck-name"
								value={name}
								disabled={isSaving}
								maxLength={1024}
								onChange={(event) => setDetailsDraft({ deckId, name: event.target.value })}
								onKeyDown={(event) => {
									if (event.key === 'Enter') void saveName();
								}}
							/>
						</div>
						{saveError && <p className={styles['save-error']} role="alert">{saveError}</p>}
						<div className={styles['deck-details-actions']}>
							<Button onClick={() => { setDetailsDraft(null); setShowDetailsModal(false); }} disabled={isSaving}>Cancel</Button>
							<Button onClick={() => { void saveName(); }} disabled={!name.trim() || isSaving}>
								{isSaving ? <SavingLabel /> : 'Save name'}
							</Button>
						</div>
					</section>
				</Modal>
			) : undefined}
			<div className={styles['deck-theme']} style={paletteStyle}>
				{topStyle === 'full-art' && topBannerCard && <DeckFullArtTop
					src={topBannerCard.art}
					crop={bannerCrop}
					name={topBannerCard.name}
				/>}
				<div className={concatClassNames(styles['index-container'], topStyle === 'full-art' ? styles['full-index'] : undefined)}>
					<div className={styles['banner-container']}>
						{topStyle === 'card' && <DeckBannerCard
							src={previewIcon}
							crop={bannerCrop}
							name={data.name}
							updatedAt={data.lastEdit}
						/>}
						<DeckControlButtons
							deckId={deckId}
							dispatch={dispatch}
							isEditMode={!!isEditMode}
							onEdit={() => { setDetailsDraft(null); setSaveError(null); setIsEditMode(true); }}
							onEditName={() => { setDetailsDraft({ deckId, name: data.name }); setSaveError(null); setShowDetailsModal(true); }}
							onDone={() => { setDetailsDraft(null); setSaveError(null); setIsEditMode(false); }}
							onImportImage={() => setShowImageImport(true)}
							isSaving={isSaving}
						/>
						<DeckImageScanCard deckId={deckId} />
						{saveError && !showDetailsModal && <p className={styles['save-error']} role="alert">{saveError}</p>}
						<DeckStatsSummary deck={data} />
					</div>
					<Decklist
						name={name}
						deck={data.deck}
						banner={topBannerCard ? {
							art: topBannerCard.art,
							name: topBannerCard.name
						} : null}
						bannerCrop={bannerCrop}
						bannerBlend={data.bannerBlend}
						topStyle={topStyle}
						onCardClick={(card: FetchAPIDeckCardResponse) => {
							if (isEditMode) {
								dispatch(Actions.setEditCard(card));
							}
						}}
					/>
				</div>
			</div>
		</Page>
	);
}

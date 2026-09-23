import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { FetchAPIDeckCardResponse } from '../../api/fetch-api-deck';
import { Button } from '../../components/Button/Button';
import { DeckBannerCard } from '../../components/DeckBannerCard/DeckBannerCard';
import { DeckFullArtTop } from '../../components/DeckFullArtTop/DeckFullArtTop';
import { DeckImageScanCard } from '../../components/ImageCardImport/DeckImageScanCard';
import type { BannerCrop } from '../../utils/banner-crop';
import type { DeckCardGroup } from '../../utils/group-deck-cards';
import type { GetDeckResponse } from '../../workers/deck.worker.messages';
import { DeckControlIcon } from './DeckControlIcons';
import { DeckStatsSummary } from './components/DeckStatsSummary/DeckStatsSummary';
import { BoardVisualizationReduxWidget } from '../../boards/BoardVisualizationReduxWidget';
import { DeckStats } from './components/DeckStats/DeckStats';
import { DeckNotes } from './components/DeckNotes/DeckNotes';
import { DeckViewSwitch, type DeckView } from './DeckViewSwitch';

import deckStyles from './deck.module.css';
import styles from './mobile-deck-view.module.css';

type MobileDeckViewProps = {
	data: GetDeckResponse;
	deckId: string;
	view: DeckView;
	bannerCrop: BannerCrop;
	topStyle: 'card' | 'full-art';
	topBannerCard:
		| {
				name: string;
				art: string | null;
		  }
		| undefined;
	previewIcon: string | null;
	paletteStyle?: React.CSSProperties;
	isSaving: boolean;
	cardActionError: string | null;
	onBannerElement: (element: HTMLElement | null) => void;
	onAddCard: () => void;
	onAddCards: () => void;
	onImportImage: () => void;
	onEditName: () => void;
	onDeleteDeck: () => void;
	onEditCard: (group: DeckCardGroup) => void;
	onViewCard: (card: FetchAPIDeckCardResponse) => void;
};

type MobileDeckControlsProps = Pick<
	MobileDeckViewProps,
	| 'deckId'
	| 'view'
	| 'isSaving'
	| 'onAddCard'
	| 'onAddCards'
	| 'onImportImage'
	| 'onEditName'
	| 'onDeleteDeck'
>;

function MobileDeckControls(props: MobileDeckControlsProps) {
	const {
		deckId,
		view,
		isSaving,
		onAddCard,
		onAddCards,
		onImportImage,
		onEditName,
		onDeleteDeck
	} = props;
	const navigate = useNavigate();

	return (
		<div className={styles.controls}>
			<DeckViewSwitch deckId={deckId} view={view} />
			<section
				className={styles.group}
				aria-labelledby="mobile-add-cards"
			>
				<h2 id="mobile-add-cards">Add cards</h2>
				<div className={styles.addTiles}>
					<Button onClick={onAddCard} disabled={isSaving}>
						<DeckControlIcon name="search" />
						<span>Search</span>
					</Button>
					<Button onClick={onAddCards} disabled={isSaving}>
						<DeckControlIcon name="list" />
						<span>Paste list</span>
					</Button>
					<Button onClick={onImportImage} disabled={isSaving}>
						<DeckControlIcon name="camera" />
						<span>Scan image</span>
					</Button>
				</div>
			</section>
			<section
				className={styles.group}
				aria-labelledby="mobile-deck-actions"
			>
				<h2 id="mobile-deck-actions">Deck</h2>
				<div className={styles.deckActions}>
					<Button onClick={onEditName} disabled={isSaving}>
						Rename
					</Button>
					<Button onClick={() => navigate(`/deck/${deckId}/history`)}>
						History
					</Button>
					<Button
						onClick={() => navigate(`/deck/${deckId}/settings`)}
					>
						Appearance
					</Button>
					<Button
						className={styles.deleteDeck}
						disabled={isSaving}
						onClick={onDeleteDeck}
					>
						Delete
					</Button>
				</div>
			</section>
		</div>
	);
}

/** Phone-only deck renderer with touch-optimized controls and card actions. */
export function MobileDeckView(props: MobileDeckViewProps) {
	const {
		data,
		deckId,
		view,
		bannerCrop,
		topStyle,
		topBannerCard,
		previewIcon,
		paletteStyle,
		isSaving,
		cardActionError,
		onBannerElement,
		onAddCard,
		onAddCards,
		onImportImage,
		onEditName,
		onDeleteDeck,
		onEditCard,
		onViewCard
	} = props;

	return (
		<div className={deckStyles['deck-theme']} style={paletteStyle}>
			{topStyle === 'full-art' && topBannerCard?.art && (
				<DeckFullArtTop
					ref={onBannerElement}
					src={topBannerCard.art}
					crop={bannerCrop}
					name={data.name}
					cardCount={data.deck.count}
					variant="mobile"
				/>
			)}
			<div
				className={`${styles.layout}${
					topStyle === 'full-art' ? ` ${styles.fullArt}` : ''
				}`}
			>
				<div className={styles.summary}>
					{topStyle === 'card' && (
						<DeckBannerCard
							ref={onBannerElement}
							src={previewIcon}
							crop={bannerCrop}
							name={data.name}
							cardCount={data.deck.count}
							updatedAt={data.lastEdit}
							variant="mobile"
						/>
					)}
					<MobileDeckControls
						deckId={deckId}
						view={view}
						isSaving={isSaving}
						onAddCard={onAddCard}
						onAddCards={onAddCards}
						onImportImage={onImportImage}
						onEditName={onEditName}
						onDeleteDeck={onDeleteDeck}
					/>
					<DeckImageScanCard deckId={deckId} />
					<DeckStatsSummary deck={data} />
				</div>
				{cardActionError && (
					<p className={styles.cardActionError} role="alert">
						{cardActionError}
					</p>
				)}
				{view === 'tabletop' ? (
					<BoardVisualizationReduxWidget
						visualization="mtg-arena-table"
						deckId={deckId}
						onViewCard={onViewCard}
						onEditCard={onEditCard}
					/>
				) : view === 'stats' ? (
					<DeckStats cards={data.cards} />
				) : view === 'notes' ? (
					<DeckNotes
						deckId={deckId}
						notes={data.notes ?? []}
					/>
				) : (
					<BoardVisualizationReduxWidget
						deckId={deckId}
						onViewCard={onViewCard}
						onEditCard={onEditCard}
					/>
				)}
			</div>
			<button
				type="button"
				className={styles.addCardButton}
				aria-label="Add card"
				disabled={isSaving}
				onClick={onAddCard}
			>
				<svg
					viewBox="0 0 24 24"
					width="28"
					height="28"
					aria-hidden="true"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
			</button>
		</div>
	);
}

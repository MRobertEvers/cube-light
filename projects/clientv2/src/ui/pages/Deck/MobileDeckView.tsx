import React from 'react';
import type { DeckCardEntry } from '../../../domain/models/deck';
import { DeckFullArtTop } from '../../kit/components/DeckFullArtTop/DeckFullArtTop';
import type { DeckCardGroup } from '../../../domain/deck/group-deck-cards';
import { artworkOf } from '../../../domain/appearance/artwork';
import { BoardVisualizationReduxWidget } from '../../features/boards/BoardVisualizationReduxWidget';
import type { BoardControlsProps } from '../../features/boards/board.types';
import {
	deckPageVisualization,
	deckViewShowsBoard
} from '../../features/boards/board-visualizations';
import { DeckStats } from './components/DeckStats/DeckStats';
import { DeckNotes } from './components/DeckNotes/DeckNotes';

import deckStyles from './deck.module.css';
import styles from './mobile-deck-view.module.css';

type MobileDeckViewProps = {
	/** Also carries the deck, its id, the tab and the page's top style. */
	controls: BoardControlsProps;
	topBannerCard:
		| {
				name: string;
				art: string | null;
		  }
		| undefined;
	paletteStyle?: React.CSSProperties;
	onEditCard: (group: DeckCardGroup) => void;
	onViewCard: (card: DeckCardEntry) => void;
};

/** Phone-only deck renderer: the visualization's mobile controls and mobile board. */
export function MobileDeckView(props: MobileDeckViewProps) {
	const { controls, topBannerCard, paletteStyle, onEditCard, onViewCard } =
		props;
	const {
		deck: data,
		deckId,
		view,
		topStyle,
		bannerCrop,
		isSaving,
		onBannerElement,
		onAddCard
	} = controls;

	const visualization = deckPageVisualization(view, data.boardVisualization);
	const { mobileLayout: layout, mobileControls: Controls } = visualization;

	return (
		<div className={deckStyles['deck-theme']} style={paletteStyle}>
			{topStyle === 'full-art' && topBannerCard?.art && (
				<DeckFullArtTop
					ref={onBannerElement}
					src={topBannerCard.art}
					artInfo={artworkOf(data.artwork, topBannerCard.art)}
					crop={bannerCrop}
					name={data.name}
					cardCount={data.deck.count}
					variant="mobile"
				/>
			)}
			<div
				className={`${styles.layout}${
					topStyle === 'full-art' ? ` ${styles.fullArt}` : ''
				}${layout.width === 'full' ? ` ${styles.fullWidth}` : ''}`}
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
				{deckViewShowsBoard(view) ? (
					<div className={styles.board}>
						<BoardVisualizationReduxWidget
							visualization={visualization.id}
							deckId={deckId}
							ownershipFilter={controls.ownershipFilter}
							onViewCard={onViewCard}
							onEditCard={onEditCard}
						/>
					</div>
				) : view === 'stats' ? (
					<DeckStats cards={data.cards} />
				) : (
					<DeckNotes deckId={deckId} notes={data.notes ?? []} />
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

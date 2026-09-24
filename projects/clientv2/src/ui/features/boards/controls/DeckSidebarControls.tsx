import React from 'react';
import { DeckBannerCard } from '../../../kit/components/DeckBannerCard/DeckBannerCard';
import { DeckImageScanCard } from '../../../kit/components/ImageCardImport/DeckImageScanCard';
import { DeckControlButtons } from '../../deck-chrome/DeckControlButtons';
import { DeckStatsSummary } from '../../deck-chrome/DeckStatsSummary';
import type { BoardControlsProps } from '../board.types';
import { artworkOf } from '../../../../domain/appearance/artwork';

import deckStyles from '../../../pages/Deck/deck.module.css';

/** A column beside the board: the banner card, then every control stacked. */
export function DeckSidebarControls(props: BoardControlsProps) {
	const {
		deck,
		deckId,
		view,
		topStyle,
		bannerCrop,
		previewIcon,
		isSaving,
		errors,
		onBannerElement,
		onAddCard,
		onAddCards,
		onImportImage,
		onEditName,
		onDeleteDeck
	} = props;
	return (
		<>
			{topStyle === 'card' && (
				<DeckBannerCard
					ref={onBannerElement}
					src={previewIcon}
					artInfo={artworkOf(deck.artwork, previewIcon)}
					crop={bannerCrop}
					name={deck.name}
					cardCount={deck.deck.count}
					updatedAt={deck.lastEdit}
				/>
			)}
			<DeckControlButtons
				view={view}
				deckId={deckId}
				onEditName={onEditName}
				onDeleteDeck={onDeleteDeck}
				onAddCard={onAddCard}
				onImportImage={onImportImage}
				onAddCards={onAddCards}
				isSaving={isSaving}
			/>
			<DeckImageScanCard deckId={deckId} />
			{errors.map((error) => (
				<p key={error} className={deckStyles['save-error']} role="alert">
					{error}
				</p>
			))}
			<DeckStatsSummary deck={deck} />
		</>
	);
}

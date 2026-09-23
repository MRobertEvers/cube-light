import React from 'react';
import { DeckBannerCard } from '../../../kit/components/DeckBannerCard/DeckBannerCard';
import { DeckImageScanCard } from '../../../kit/components/ImageCardImport/DeckImageScanCard';
import { MobileDeckControls } from '../../deck-chrome/MobileDeckControls';
import { DeckStatsSummary } from '../../deck-chrome/DeckStatsSummary';
import type { BoardControlsProps } from '../board.types';

import mobileStyles from '../../../pages/Deck/mobile-deck-view.module.css';

/** Above a mobile board: the banner card, touch-sized controls and the deck's counts. */
export function MobileDeckSummaryControls(props: BoardControlsProps) {
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
			<div className={mobileStyles.summary}>
				{topStyle === 'card' && (
					<DeckBannerCard
						ref={onBannerElement}
						src={previewIcon}
						crop={bannerCrop}
						name={deck.name}
						cardCount={deck.deck.count}
						updatedAt={deck.lastEdit}
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
				<DeckStatsSummary deck={deck} />
			</div>
			{errors.map((error) => (
				<p
					key={error}
					className={mobileStyles.cardActionError}
					role="alert"
				>
					{error}
				</p>
			))}
		</>
	);
}

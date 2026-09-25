import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { MobileDeckSummaryControls } from '../controls/MobileDeckSummaryControls';

/** The mobile cube view's controls: the deck summary above the colors. */
export function MobileCubeTutorBoardControls(props: BoardControlsProps) {
	return (
		<MobileDeckSummaryControls
			deck={props.deck}
			deckId={props.deckId}
			view={props.view}
			topStyle={props.topStyle}
			bannerCrop={props.bannerCrop}
			previewIcon={props.previewIcon}
			isSaving={props.isSaving}
			errors={props.errors}
			onBannerElement={props.onBannerElement}
			onAddCard={props.onAddCard}
			onAddCards={props.onAddCards}
			onImportImage={props.onImportImage}
			onEditName={props.onEditName}
			onDeleteDeck={props.onDeleteDeck}
			ownership={props.ownership}
			ownershipFilter={props.ownershipFilter}
			onOwnershipFilter={props.onOwnershipFilter}
			onAddMissing={props.onAddMissing}
		/>
	);
}

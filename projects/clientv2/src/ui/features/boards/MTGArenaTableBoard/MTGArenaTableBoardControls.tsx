import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { DeckToolbarControls } from '../controls/DeckToolbarControls';

/** The tabletop's controls: one compact row, so the columns get the page's height and width. */
export function MTGArenaTableBoardControls(props: BoardControlsProps) {
	return (
		<DeckToolbarControls
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

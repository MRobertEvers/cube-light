import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { DeckSidebarControls } from '../controls/DeckSidebarControls';

/** The deck list's controls: a sidebar beside the list. */
export function DecklistBoardControls(props: BoardControlsProps) {
	return (
		<DeckSidebarControls
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

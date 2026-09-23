import React from 'react';
import type { BoardControlsProps } from '../board.types';
import { DeckToolbarControls } from '../controls/DeckToolbarControls';

/** The cube view's controls: one compact row, so the color columns get the page's whole width. */
export function CubeTutorBoardControls(props: BoardControlsProps) {
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
		/>
	);
}

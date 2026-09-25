import React from 'react';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { decklistSpotlight } from '../decklist-spotlight';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { MobileDecklistBoard } from './MobileDecklistBoard';
import { useAppSelector } from '../../../../redux/use-app-selector';

/** MobileDecklistBoard for a deck in the store. Renders nothing until the deck loads. */
export function MobileDecklistBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const onCardEvent = useBoardCardEvents(props);
	if (!view) return null;
	const spotlight = decklistSpotlight(view.deck);

	return (
		<MobileDecklistBoard
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			banner={spotlight.banner}
			bannerCrop={spotlight.bannerCrop}
			bannerBlend={spotlight.bannerBlend}
			topStyle={spotlight.topStyle}
		/>
	);
}

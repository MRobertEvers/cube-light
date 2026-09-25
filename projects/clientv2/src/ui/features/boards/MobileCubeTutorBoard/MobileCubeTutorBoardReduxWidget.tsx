import React from 'react';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { MobileCubeTutorBoard } from './MobileCubeTutorBoard';
import { useAppSelector } from '../../../../redux/use-app-selector';

/** MobileCubeTutorBoard for a deck in the store. Renders nothing until the deck loads. */
export function MobileCubeTutorBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const onCardEvent = useBoardCardEvents(props);
	if (!view) return null;

	return (
		<MobileCubeTutorBoard
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
		/>
	);
}

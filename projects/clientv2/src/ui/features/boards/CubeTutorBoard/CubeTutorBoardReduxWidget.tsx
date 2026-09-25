import React from 'react';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { CubeTutorBoard } from './CubeTutorBoard';
import { useAppSelector } from '../../../../redux/use-app-selector';

/** CubeTutorBoard for a deck in the store. Renders nothing until the deck loads. */
export function CubeTutorBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const onCardEvent = useBoardCardEvents(props);
	if (!view) return null;

	return (
		<CubeTutorBoard
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
		/>
	);
}

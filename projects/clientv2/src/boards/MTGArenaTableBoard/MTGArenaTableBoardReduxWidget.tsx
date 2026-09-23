import React from 'react';
import { useSelector } from 'react-redux';
import {
	selectDeck,
	selectDeckCardAction
} from '../../store/decks/decks.state';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MTGArenaTableBoard } from './MTGArenaTableBoard';

type DecksRoot = Parameters<typeof selectDeck>[0];

/** MTGArenaTableBoard for a deck in the store. Renders nothing until the deck loads. */
export function MTGArenaTableBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId } = props;
	const data = useSelector((root: DecksRoot) => selectDeck(root, deckId));
	const cardAction = useSelector((root: DecksRoot) =>
		selectDeckCardAction(root, deckId)
	);
	const onCardEvent = useBoardCardEvents(props);
	if (!data) return null;

	return (
		<MTGArenaTableBoard
			cards={data.boards}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
		/>
	);
}

import React from 'react';
import { useSelector } from 'react-redux';
import {
	selectDeck,
	selectDeckCardAction
} from '../../../../state/decks/decks.state';
import type { BoardReduxWidgetProps } from '../board.types';
import { decklistSpotlight } from '../decklist-spotlight';
import { useBoardCardEvents } from '../use-board-card-events';
import { DecklistBoard } from './DecklistBoard';

type DecksRoot = Parameters<typeof selectDeck>[0];

/** DecklistBoard for a deck in the store. Renders nothing until the deck loads. */
export function DecklistBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId } = props;
	const data = useSelector((root: DecksRoot) => selectDeck(root, deckId));
	const cardAction = useSelector((root: DecksRoot) =>
		selectDeckCardAction(root, deckId)
	);
	const onCardEvent = useBoardCardEvents(props);
	if (!data) return null;

	return (
		<DecklistBoard
			cards={data.boards}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			{...decklistSpotlight(data)}
		/>
	);
}

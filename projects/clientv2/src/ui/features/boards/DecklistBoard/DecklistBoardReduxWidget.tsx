import React from 'react';
import { selectDeck, selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import type { BoardReduxWidgetProps } from '../board.types';
import { decklistSpotlight } from '../decklist-spotlight';
import { useBoardCardEvents } from '../use-board-card-events';
import { DecklistBoard } from './DecklistBoard';
import { useAppSelector } from '../../../../redux/use-app-selector';

/** DecklistBoard for a deck in the store. Renders nothing until the deck loads. */
export function DecklistBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId } = props;
	const data = useAppSelector((root) => selectDeck(root, deckId));
	const cardAction = useAppSelector((root) =>
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

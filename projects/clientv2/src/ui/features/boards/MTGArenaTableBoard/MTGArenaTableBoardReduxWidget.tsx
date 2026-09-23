import React, { useCallback } from 'react';
import { arenaSearchChanged } from '../../../../redux/arena-table/arenaTableSlice';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectDeck, selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import { useAppDispatch } from '../../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../../redux/use-app-selector';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MTGArenaTableBoard } from './MTGArenaTableBoard';

/** MTGArenaTableBoard for a deck in the store, with its search kept in the store. Renders nothing until the deck loads. */
export function MTGArenaTableBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId } = props;
	const dispatch = useAppDispatch();
	const data = useAppSelector((root) => selectDeck(root, deckId));
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const search = useAppSelector((root) => selectArenaSearch(root, deckId));
	const onCardEvent = useBoardCardEvents(props);
	const onSearchChange = useCallback(
		(next: string) => dispatch(arenaSearchChanged({ deckId, search: next })),
		[deckId, dispatch]
	);
	if (!data) return null;

	return (
		<MTGArenaTableBoard
			cards={data.boards}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			search={search}
			onSearchChange={onSearchChange}
		/>
	);
}

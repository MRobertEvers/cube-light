import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
	arenaSearchChanged,
	selectArenaSearch
} from '../../../../state/arena-table/arena-table.state';
import {
	selectDeck,
	selectDeckCardAction
} from '../../../../state/decks/decks.state';
import { useAppDispatch } from '../../../../state/use-app-dispatch';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { MTGArenaTableBoard } from './MTGArenaTableBoard';

type Root = Parameters<typeof selectDeck>[0] &
	Parameters<typeof selectArenaSearch>[0];

/** MTGArenaTableBoard for a deck in the store, with its search kept in the store. Renders nothing until the deck loads. */
export function MTGArenaTableBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId } = props;
	const dispatch = useAppDispatch();
	const data = useSelector((root: Root) => selectDeck(root, deckId));
	const cardAction = useSelector((root: Root) =>
		selectDeckCardAction(root, deckId)
	);
	const search = useSelector((root: Root) => selectArenaSearch(root, deckId));
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

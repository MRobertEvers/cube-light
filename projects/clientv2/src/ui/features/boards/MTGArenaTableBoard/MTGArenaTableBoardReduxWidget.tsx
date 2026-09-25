import React, { useCallback } from 'react';
import { arenaSearchChanged } from '../../../../redux/arena-table/arenaTableSlice';
import { selectArenaSearch } from '../../../../redux/arena-table/arena-table.selectors';
import { selectConnectivity } from '../../../../redux/connectivity/connectivity.selectors';
import { selectDeckCardAction } from '../../../../redux/decks/decks.selectors';
import { useAppDispatch } from '../../../../redux/use-app-dispatch';
import { useAppSelector } from '../../../../redux/use-app-selector';
import type { BoardReduxWidgetProps } from '../board.types';
import { useBoardCardEvents } from '../use-board-card-events';
import { useDeckBoardView } from '../use-deck-board-view';
import { MTGArenaTableBoardOffline } from './MTGArenaTableBoardOffline';
import { MTGArenaTableBoardOnline } from './MTGArenaTableBoardOnline';

/**
 * The tabletop for a deck in the store, with its search kept in the store:
 * card images online, card text offline. Renders nothing until the deck loads.
 */
export function MTGArenaTableBoardReduxWidget(props: BoardReduxWidgetProps) {
	const { deckId, ownershipFilter } = props;
	const dispatch = useAppDispatch();
	const view = useDeckBoardView(deckId, ownershipFilter);
	const cardAction = useAppSelector((root) =>
		selectDeckCardAction(root, deckId)
	);
	const search = useAppSelector((root) => selectArenaSearch(root, deckId));
	const connectivity = useAppSelector(selectConnectivity);
	const onCardEvent = useBoardCardEvents(props);
	const onSearchChange = useCallback(
		(next: string) => dispatch(arenaSearchChanged({ deckId, search: next })),
		[deckId, dispatch]
	);
	if (!view) return null;

	return connectivity === 'online' ? (
		<MTGArenaTableBoardOnline
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			search={search}
			onSearchChange={onSearchChange}
		/>
	) : (
		<MTGArenaTableBoardOffline
			cards={view.cards}
			annotations={view.annotations}
			busyGroup={cardAction.busy}
			onCardEvent={onCardEvent}
			search={search}
			onSearchChange={onSearchChange}
		/>
	);
}
